// Server-side fetch + cache for Voteview Congressional roll-call data.
//
// Voteview (voteview.com) is the canonical academic source for every
// roll-call vote in U.S. Congressional history. It's free, no API key,
// well-maintained by UCLA, and updated as votes happen. The full data is
// ~16MB for the current Congress so we fetch + parse once per server
// instance and cache in-memory; subsequent /api/votes requests just slice
// the cached tables.
//
// Three files we need:
//   - members:   maps Voteview's icpsr id <-> bioguide id we already use
//   - rollcalls: per-vote metadata (date, bill_number, vote_desc, result)
//   - votes:     per-member-per-rollcall cast_code (1=Yea, 6=Nay, etc.)
//
// We currently load Senate 119 (current Congress) and Senate 118 so a
// senator who didn't have many recent votes still has history visible.
// House requires a 14MB votes file per Congress; we'll add it in a follow-
// up after validating the Senate end-to-end.

import Papa from "papaparse";

const VOTEVIEW_BASE = "https://voteview.com/static/data/out";
const MEMBERS_URL = `${VOTEVIEW_BASE}/members/HSall_members.csv`;
const ROLLCALLS_URL = (chamber: "S" | "H", congress: number) =>
  `${VOTEVIEW_BASE}/rollcalls/${chamber}${congress}_rollcalls.csv`;
const VOTES_URL = (chamber: "S" | "H", congress: number) =>
  `${VOTEVIEW_BASE}/votes/${chamber}${congress}_votes.csv`;

// Per-chamber list of Congresses we'll pull. 119 = current (2025-2027),
// 118 = previous (2023-2025). The House votes file for one Congress is
// ~14 MB; loading both chambers up front balloons cold-start memory and
// time. Instead getRecentVotesByBioguide only loads the chamber it
// actually needs, scoped down further by the caller's `chamber` arg
// when passed (the panel already knows the chamber from the legislator
// row it's expanding).
const CONGRESSES_BY_CHAMBER: Record<"S" | "H", number[]> = {
  S: [119, 118],
  H: [119, 118],
};

export type CastCode = "Yea" | "Nay" | "Present" | "Not Voting" | "Other";

export type LegislatorVote = {
  congress: number;
  chamber: "Senate" | "House";
  rollnumber: number;
  date: string; // ISO YYYY-MM-DD
  billNumber: string | null;
  voteQuestion: string;
  voteDesc: string;
  voteResult: string;
  yeaCount: number;
  nayCount: number;
  cast: CastCode;
};

// Raw row shapes (only fields we use are typed).
type MemberRow = {
  congress: string;
  chamber: string;
  icpsr: string;
  bioguide_id: string;
  party_code: string;
};

type RollcallRow = {
  congress: string;
  chamber: string;
  rollnumber: string;
  date: string;
  yea_count: string;
  nay_count: string;
  bill_number: string;
  vote_result: string;
  vote_desc: string;
  vote_question: string;
};

type VoteRow = {
  congress: string;
  chamber: string;
  rollnumber: string;
  icpsr: string;
  cast_code: string;
};

// ICPSR cast_code → display string. Reference:
// https://voteview.com/articles/data_help_votes
function decodeCast(code: string): CastCode {
  switch (code) {
    case "1":
    case "2":
    case "3":
      return "Yea";
    case "4":
    case "5":
    case "6":
      return "Nay";
    case "7":
    case "8":
      return "Present";
    case "9":
      return "Not Voting";
    case "0":
      return "Other";
    default:
      return "Other";
  }
}

function normalizeBillNumber(s: string | undefined | null): string | null {
  const v = (s || "").trim();
  if (!v || v === "NA" || v === "null") return null;
  return v;
}

// Caches. Loaded lazily once per server process. The Promise pattern
// short-circuits concurrent first-request races: every caller awaits the
// same in-flight Promise instead of triggering parallel downloads.
let bioguideToIcpsrPromise: Promise<Map<string, string>> | null = null;
const rollcallsCache = new Map<string, Map<number, RollcallRow>>();
const votesByIcpsrCache = new Map<string, Map<string, VoteRow[]>>();
const congressLoadPromises = new Map<string, Promise<void>>();

// icpsr -> simplified party per congress, used for party-line alignment.
// Voteview's party_code values: 100-199 = Democratic family, 200-299 =
// Republican family, others = third-party / independent. We collapse to
// 'D' / 'R' / 'I' to match the legislator type, treating anything not
// in the two-party majority buckets as Independent.
const partyByIcpsrCache = new Map<string, Map<string, "D" | "R" | "I">>();

// Lazy cache of party majority per rollcall ("Yea"/"Nay"/"Split"). Computed
// the first time alignment is asked for and shared across all subsequent
// requests in the same server process.
type PartyPosition = "Yea" | "Nay" | "Split";
const partyMajoritiesCache = new Map<
  string, // chamber+congress+rollnumber
  { D: PartyPosition; R: PartyPosition; I: PartyPosition }
>();

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    // Voteview serves these files with cache headers Vercel will respect;
    // no-store would defeat that. Allow normal caching.
    next: { revalidate: 60 * 60 * 6 }, // 6 hours
  });
  if (!res.ok) {
    throw new Error(`Voteview fetch ${url} failed: HTTP ${res.status}`);
  }
  return res.text();
}

function parseCsv<T>(text: string): T[] {
  const parsed = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  return parsed.data;
}

// Build bioguide_id → icpsr map. The HSall_members file has every
// Congress / chamber combination for every member who ever served, so
// many bioguide ids appear multiple times. We want the most recent
// (highest congress number) ICPSR id, because that's the one used in
// current rollcall data.
async function loadBioguideToIcpsr(): Promise<Map<string, string>> {
  if (!bioguideToIcpsrPromise) {
    bioguideToIcpsrPromise = (async () => {
      const text = await fetchText(MEMBERS_URL);
      const rows = parseCsv<MemberRow>(text);
      const latestCongressByBioguide = new Map<string, number>();
      const map = new Map<string, string>();
      for (const row of rows) {
        const bioguide = (row.bioguide_id || "").trim();
        const icpsr = (row.icpsr || "").trim();
        if (!bioguide || !icpsr) continue;
        const congress = Number(row.congress);
        if (!Number.isFinite(congress)) continue;
        const seen = latestCongressByBioguide.get(bioguide) ?? -1;
        if (congress > seen) {
          latestCongressByBioguide.set(bioguide, congress);
          map.set(bioguide, icpsr);
        }
      }
      return map;
    })();
  }
  return bioguideToIcpsrPromise;
}

function cacheKey(chamber: "S" | "H", congress: number): string {
  return `${chamber}${congress}`;
}

function partyCodeToSimple(code: string): "D" | "R" | "I" {
  const n = Number(code);
  if (!Number.isFinite(n)) return "I";
  if (n >= 100 && n < 200) return "D";
  if (n >= 200 && n < 300) return "R";
  return "I";
}

// Build (icpsr -> party) for one congress+chamber by scanning the global
// HSall_members rows we already have to fetch for the bioguide map. We
// keep this in a separate cache because the latest-bioguide-to-icpsr map
// doesn't preserve which congress the icpsr was tied to. Voteview's
// chamber column in HSall_members uses "House" / "Senate".
async function loadPartiesForCongress(
  chamber: "S" | "H",
  congress: number
): Promise<Map<string, "D" | "R" | "I">> {
  const key = cacheKey(chamber, congress);
  const existing = partyByIcpsrCache.get(key);
  if (existing) return existing;
  const text = await fetchText(MEMBERS_URL);
  const rows = parseCsv<MemberRow>(text);
  const chamberFull = chamber === "S" ? "Senate" : "House";
  const m = new Map<string, "D" | "R" | "I">();
  for (const row of rows) {
    if (Number(row.congress) !== congress) continue;
    if ((row.chamber || "").trim() !== chamberFull) continue;
    const icpsr = (row.icpsr || "").trim();
    if (!icpsr) continue;
    m.set(icpsr, partyCodeToSimple(row.party_code));
  }
  partyByIcpsrCache.set(key, m);
  return m;
}

async function loadCongress(chamber: "S" | "H", congress: number): Promise<void> {
  const key = cacheKey(chamber, congress);
  if (rollcallsCache.has(key) && votesByIcpsrCache.has(key)) return;
  const existing = congressLoadPromises.get(key);
  if (existing) return existing;

  const p = (async () => {
    const [rollcallText, votesText] = await Promise.all([
      fetchText(ROLLCALLS_URL(chamber, congress)),
      fetchText(VOTES_URL(chamber, congress)),
    ]);

    const rollcallRows = parseCsv<RollcallRow>(rollcallText);
    const rollcallMap = new Map<number, RollcallRow>();
    for (const row of rollcallRows) {
      const n = Number(row.rollnumber);
      if (Number.isFinite(n)) rollcallMap.set(n, row);
    }
    rollcallsCache.set(key, rollcallMap);

    const voteRows = parseCsv<VoteRow>(votesText);
    const byIcpsr = new Map<string, VoteRow[]>();
    for (const row of voteRows) {
      const icpsr = (row.icpsr || "").trim();
      if (!icpsr) continue;
      const bucket = byIcpsr.get(icpsr);
      if (bucket) bucket.push(row);
      else byIcpsr.set(icpsr, [row]);
    }
    votesByIcpsrCache.set(key, byIcpsr);
  })();

  congressLoadPromises.set(key, p);
  try {
    await p;
  } finally {
    // Keep the resolved load Promise out of the inflight map; the data is
    // cached in rollcallsCache / votesByIcpsrCache from here on.
    congressLoadPromises.delete(key);
  }
}

export async function getRecentVotesByBioguide(
  bioguide: string,
  options: { chamber?: "Senate" | "House"; limit?: number } = {}
): Promise<LegislatorVote[]> {
  const limit = options.limit ?? 15;
  const bioguideToIcpsr = await loadBioguideToIcpsr();
  const icpsr = bioguideToIcpsr.get(bioguide.trim());
  if (!icpsr) return [];

  // If the caller already knows the chamber (the panel always does),
  // restrict to just that chamber's CSVs so we don't pull 14 MB of
  // House data to answer a Senate query.
  const chambersToLoad: Array<"S" | "H"> = options.chamber
    ? [options.chamber === "Senate" ? "S" : "H"]
    : ["S", "H"];

  const loads: Promise<void>[] = [];
  for (const ch of chambersToLoad) {
    for (const congress of CONGRESSES_BY_CHAMBER[ch]) {
      loads.push(loadCongress(ch, congress));
    }
  }
  await Promise.all(loads);

  const allVotes: LegislatorVote[] = [];
  for (const ch of chambersToLoad) {
    for (const congress of CONGRESSES_BY_CHAMBER[ch]) {
      const key = cacheKey(ch, congress);
      const byIcpsr = votesByIcpsrCache.get(key);
      const rollcalls = rollcallsCache.get(key);
      if (!byIcpsr || !rollcalls) continue;
      const memberVotes = byIcpsr.get(icpsr);
      if (!memberVotes) continue;

      for (const v of memberVotes) {
        const rollnumber = Number(v.rollnumber);
        if (!Number.isFinite(rollnumber)) continue;
        const meta = rollcalls.get(rollnumber);
        if (!meta) continue;
        allVotes.push({
          congress: Number(meta.congress),
          chamber: ch === "S" ? "Senate" : "House",
          rollnumber,
          date: (meta.date || "").trim(),
          billNumber: normalizeBillNumber(meta.bill_number),
          voteQuestion: (meta.vote_question || "").trim(),
          voteDesc: (meta.vote_desc || "").trim(),
          voteResult: (meta.vote_result || "").trim(),
          yeaCount: Number(meta.yea_count) || 0,
          nayCount: Number(meta.nay_count) || 0,
          cast: decodeCast(v.cast_code),
        });
      }
    }
  }

  // Sort by date desc; ties broken by congress/rollnumber so the latest
  // physical vote bubbles up first.
  allVotes.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.congress !== b.congress) return b.congress - a.congress;
    return b.rollnumber - a.rollnumber;
  });
  return allVotes.slice(0, limit);
}

// ─── Party-line alignment (v1 alignment score, honestly framed) ──────────
//
// What this computes: for each of a legislator's recent N votes, did they
// vote with the majority of their own party? Score = % "with party."
//
// What it is NOT: an "alignment with public statements" score. That requires
// a structured source of stated positions per legislator (ISideWith,
// OnTheIssues, scraped press releases + fact-checks, etc.) which we have
// not wired yet. The party-line consistency proxy is a real accountability
// signal — sustained breaks from one's party are notable — but it is not
// the original "what they said vs what they voted" thesis. UI labels this
// explicitly as a proxy with a note about the eventual full version.
//
// Method:
//   1. Group every cast on a rollcall by party (D / R / I) and count
//      Yea vs Nay. Party position = the side with >50% of votes cast.
//      Equal split or non-binary outcomes flagged "Split."
//   2. For each of the legislator's recent votes:
//      - Look up the position for THEIR party.
//      - Compare to how they cast. Yea-on-Yea or Nay-on-Nay = with party.
//      - Skip Present / Not Voting / Other casts AND Split party
//        positions (no party stance to align to).
//   3. Aggregate: with / against / total considered.

export type AlignmentVoteEntry = {
  congress: number;
  chamber: "Senate" | "House";
  rollnumber: number;
  date: string;
  cast: CastCode;
  partyPosition: PartyPosition;
  alignment: "with" | "against" | "skipped";
};

export type PartyAlignment = {
  bioguide: string;
  party: "D" | "R" | "I";
  method: "party-line-consistency-proxy";
  votesConsidered: number;
  withParty: number;
  againstParty: number;
  percentage: number; // 0..100, rounded
  perVote: AlignmentVoteEntry[];
};

async function getPartyMajoritiesForRollcall(
  chamber: "S" | "H",
  congress: number,
  rollnumber: number
): Promise<{ D: PartyPosition; R: PartyPosition; I: PartyPosition }> {
  const memoKey = `${cacheKey(chamber, congress)}:${rollnumber}`;
  const cached = partyMajoritiesCache.get(memoKey);
  if (cached) return cached;

  const partyMap = await loadPartiesForCongress(chamber, congress);
  const byIcpsr = votesByIcpsrCache.get(cacheKey(chamber, congress));
  if (!byIcpsr) {
    const empty = { D: "Split" as const, R: "Split" as const, I: "Split" as const };
    partyMajoritiesCache.set(memoKey, empty);
    return empty;
  }

  const yea: Record<"D" | "R" | "I", number> = { D: 0, R: 0, I: 0 };
  const nay: Record<"D" | "R" | "I", number> = { D: 0, R: 0, I: 0 };

  for (const [icpsr, casts] of byIcpsr) {
    const party = partyMap.get(icpsr);
    if (!party) continue;
    const cast = casts.find((c) => Number(c.rollnumber) === rollnumber);
    if (!cast) continue;
    const decoded = decodeCast(cast.cast_code);
    if (decoded === "Yea") yea[party] += 1;
    else if (decoded === "Nay") nay[party] += 1;
  }

  const positionFor = (p: "D" | "R" | "I"): PartyPosition => {
    if (yea[p] === 0 && nay[p] === 0) return "Split";
    if (yea[p] > nay[p]) return "Yea";
    if (nay[p] > yea[p]) return "Nay";
    return "Split";
  };

  const out = {
    D: positionFor("D"),
    R: positionFor("R"),
    I: positionFor("I"),
  };
  partyMajoritiesCache.set(memoKey, out);
  return out;
}

// Look up a legislator's votes on the tagged-rollcall set for a specific
// bill. Returns the substantive rollcalls (filtered by vote_question) that
// reference the given bill, with the legislator's cast on each.
//
// Used by the statement-alignment engine to score against curated bills
// rather than fuzzy keyword matching against vote_desc.

import {
  isSubstantiveVoteQuestion,
  type TaggedRollcall,
} from "./tagged-rollcalls";

export type TaggedVoteResult = {
  congress: number;
  chamber: "Senate" | "House";
  rollnumber: number;
  date: string;
  voteDesc: string;
  voteQuestion: string;
  voteResult: string;
  billNumber: string | null;
  yeaCount: number;
  nayCount: number;
  cast: CastCode;
  // The TaggedRollcall entry this was matched against — surfaced so the UI
  // can display "Bill: X / Issue: Y / Yea advances favors direction" etc.
  tag: TaggedRollcall;
};

export async function getTaggedVotesForLegislator(opts: {
  bioguide: string;
  tags: TaggedRollcall[];
}): Promise<TaggedVoteResult[]> {
  const { bioguide, tags } = opts;
  if (tags.length === 0) return [];

  const bioguideToIcpsr = await loadBioguideToIcpsr();
  const icpsr = bioguideToIcpsr.get(bioguide.trim());
  if (!icpsr) return [];

  // Group tags by (chamber, congress) so we only load each cache key once.
  const byChamberCongress = new Map<string, TaggedRollcall[]>();
  for (const tag of tags) {
    const ch: "S" | "H" = tag.chamber === "Senate" ? "S" : "H";
    const key = cacheKey(ch, tag.congress);
    const bucket = byChamberCongress.get(key);
    if (bucket) bucket.push(tag);
    else byChamberCongress.set(key, [tag]);
  }

  // Load required Congresses in parallel (no-op when already cached).
  const loads: Promise<void>[] = [];
  for (const key of byChamberCongress.keys()) {
    const ch = key[0] as "S" | "H";
    const congress = Number(key.slice(1));
    loads.push(loadCongress(ch, congress));
  }
  await Promise.all(loads);

  const results: TaggedVoteResult[] = [];

  for (const [key, tagsHere] of byChamberCongress) {
    const ch = key[0] as "S" | "H";
    const congress = Number(key.slice(1));
    const rollcalls = rollcallsCache.get(key);
    const memberVotes = votesByIcpsrCache.get(key)?.get(icpsr);
    if (!rollcalls || !memberVotes) continue;

    // Index member votes by rollnumber for O(1) lookup.
    const memberByRoll = new Map<number, VoteRow>();
    for (const v of memberVotes) {
      const n = Number(v.rollnumber);
      if (Number.isFinite(n)) memberByRoll.set(n, v);
    }

    for (const tag of tagsHere) {
      // Find all rollcalls referencing this bill, filtered to substantive
      // vote_questions unless the tag explicitly lists rollnumbers.
      const matchingRollcalls: Array<{
        rollnumber: number;
        meta: RollcallRow;
      }> = [];
      for (const [rollnumber, meta] of rollcalls) {
        if ((meta.bill_number || "").trim() !== tag.billNumber) continue;
        if (tag.rollnumbers && tag.rollnumbers.length > 0) {
          if (!tag.rollnumbers.includes(rollnumber)) continue;
        } else if (!isSubstantiveVoteQuestion(meta.vote_question)) {
          continue;
        }
        matchingRollcalls.push({ rollnumber, meta });
      }

      for (const { rollnumber, meta } of matchingRollcalls) {
        const cast = memberByRoll.get(rollnumber);
        if (!cast) continue;
        results.push({
          congress,
          chamber: ch === "S" ? "Senate" : "House",
          rollnumber,
          date: (meta.date || "").trim(),
          voteDesc: (meta.vote_desc || "").trim(),
          voteQuestion: (meta.vote_question || "").trim(),
          voteResult: (meta.vote_result || "").trim(),
          billNumber: normalizeBillNumber(meta.bill_number),
          yeaCount: Number(meta.yea_count) || 0,
          nayCount: Number(meta.nay_count) || 0,
          cast: decodeCast(cast.cast_code),
          tag,
        });
      }
    }
  }

  // Sort by date desc.
  results.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return results;
}

export async function getPartyAlignmentByBioguide(opts: {
  bioguide: string;
  party: "D" | "R" | "I";
  chamber: "Senate" | "House";
  limit?: number;
}): Promise<PartyAlignment> {
  const { bioguide, party, chamber } = opts;
  const limit = opts.limit ?? 25; // wider window than display count to get a
  // stable percentage; UI shows summary not the full list

  const votes = await getRecentVotesByBioguide(bioguide, {
    chamber,
    limit,
  });

  const ch: "S" | "H" = chamber === "Senate" ? "S" : "H";
  const perVote: AlignmentVoteEntry[] = [];
  let withParty = 0;
  let againstParty = 0;

  for (const v of votes) {
    const positions = await getPartyMajoritiesForRollcall(
      ch,
      v.congress,
      v.rollnumber
    );
    const pos = positions[party];
    const cast = v.cast;
    let alignment: "with" | "against" | "skipped" = "skipped";
    if (pos !== "Split" && (cast === "Yea" || cast === "Nay")) {
      if (cast === pos) {
        alignment = "with";
        withParty += 1;
      } else {
        alignment = "against";
        againstParty += 1;
      }
    }
    perVote.push({
      congress: v.congress,
      chamber: v.chamber,
      rollnumber: v.rollnumber,
      date: v.date,
      cast: v.cast,
      partyPosition: pos,
      alignment,
    });
  }

  const considered = withParty + againstParty;
  const percentage =
    considered > 0 ? Math.round((withParty / considered) * 100) : 0;

  return {
    bioguide,
    party,
    method: "party-line-consistency-proxy",
    votesConsidered: considered,
    withParty,
    againstParty,
    percentage,
    perVote,
  };
}
