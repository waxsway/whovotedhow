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

// Which Congresses we load up-front. 119 = current (2025-2027), 118 =
// previous (2023-2025). Both for context; recent UI defaults to the
// last 15 votes regardless of Congress boundary.
const CONGRESSES_TO_LOAD: Array<{ congress: number; chamber: "S" | "H" }> = [
  { congress: 119, chamber: "S" },
  { congress: 118, chamber: "S" },
  // House will be added after Senate is verified end-to-end.
];

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
  limit = 15
): Promise<LegislatorVote[]> {
  const bioguideToIcpsr = await loadBioguideToIcpsr();
  const icpsr = bioguideToIcpsr.get(bioguide.trim());
  if (!icpsr) return [];

  // Load all configured Congresses in parallel. Once they're cached the
  // second call is a no-op.
  await Promise.all(
    CONGRESSES_TO_LOAD.map((c) => loadCongress(c.chamber, c.congress))
  );

  const allVotes: LegislatorVote[] = [];
  for (const { chamber, congress } of CONGRESSES_TO_LOAD) {
    const key = cacheKey(chamber, congress);
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
        chamber: chamber === "S" ? "Senate" : "House",
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

  // Sort by date desc; ties broken by congress/rollnumber so the latest
  // physical vote bubbles up first.
  allVotes.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.congress !== b.congress) return b.congress - a.congress;
    return b.rollnumber - a.rollnumber;
  });
  return allVotes.slice(0, limit);
}
