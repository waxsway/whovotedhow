// Federal candidates currently running for office. This is the
// "for upcoming elections" side of the educational mission — voters
// should be able to see who's challenging their incumbents, who's
// running for open seats, and who's filed for office in their state
// alongside the incumbents already represented in the map.
//
// Data source: FEC /v1/candidates/search endpoint. Every candidate
// who files for federal office (House, Senate, President) has to
// register with the FEC, so this is the most authoritative public
// list of who's actually running.
//
// We filter to:
//   - candidate_status = "C" (currently registered + active)
//   - election_year = current cycle
//   - has_raised_funds = true (skips paper-only filings that never
//     develop into real campaigns; cuts the noise floor significantly)
//   - office = H or S only (President shown separately if ever added)
//
// We also enrich each candidate row with their incumbent_challenge
// status so the UI can distinguish "Challenger" from "Open seat"
// from "Incumbent" (we suppress incumbents from this list since they
// already appear in the main legislators data).
//
// Caching strategy: per-state, lazy. A given state's data is fetched
// on first request, cached in memory keyed by (state, cycle), and
// reused across calls within the same server process. Stale entries
// are evicted when the active cycle rolls over. Next.js fetch-layer
// caching (revalidate: 12h) handles the cross-process layer.

const FEC_BASE = "https://api.open.fec.gov/v1";

function getApiKey(): string {
  const key = process.env.FEC_API_KEY;
  if (!key) {
    throw new Error(
      "FEC_API_KEY environment variable is not set. Get a free key at https://api.data.gov/signup/"
    );
  }
  return key;
}

// ─── Raw upstream shape (only the fields we use) ────────────────────────

type FecRawCandidate = {
  candidate_id?: string;
  name?: string; // "LAST, FIRST" format
  office?: "H" | "S" | "P";
  office_full?: string;
  party?: string; // "DEM" | "REP" | "IND" | "LIB" | "GRE" | etc.
  party_full?: string;
  state?: string; // 2-letter USPS
  district?: string;
  district_number?: number;
  election_years?: number[];
  cycles?: number[];
  candidate_status?: string;
  candidate_inactive?: boolean;
  incumbent_challenge?: "I" | "C" | "O";
  incumbent_challenge_full?: string;
  has_raised_funds?: boolean;
  first_file_date?: string;
  last_file_date?: string;
  principal_committees?: Array<{ committee_id?: string; name?: string }>;
};

type FecCandidatesResponse = {
  results?: FecRawCandidate[];
  pagination?: {
    pages?: number;
    page?: number;
    per_page?: number;
    count?: number;
  };
};

// ─── Normalized shape we expose ─────────────────────────────────────────

export type CandidateChallengeRole = "Incumbent" | "Challenger" | "Open seat" | "Unknown";

export type CandidateParty = "D" | "R" | "I" | "L" | "G" | "Other";

export type Candidate = {
  fecId: string; // e.g. H6UT01178
  name: string; // "First Last" format
  rawName: string; // FEC's "LAST, FIRST" format
  office: "Senate" | "House";
  state: string;
  district: number | null; // null for Senate
  party: CandidateParty;
  partyLabel: string; // "Democratic", "Republican", "Independent", etc.
  challengeRole: CandidateChallengeRole;
  electionYear: number;
  principalCommitteeId: string | null;
  principalCommitteeName: string | null;
  firstFiled: string | null;
};

// ─── Helpers ────────────────────────────────────────────────────────────

function reformatName(raw: string | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const commaIdx = trimmed.indexOf(",");
  if (commaIdx === -1) return toTitleCase(trimmed);
  const last = trimmed.slice(0, commaIdx).trim();
  const rest = trimmed.slice(commaIdx + 1).trim();
  const firstWord = rest.split(/\s+/)[0] || "";
  const middleParts = rest.split(/\s+/).slice(1);
  const middle = middleParts.length ? ` ${middleParts.join(" ")}` : "";
  return toTitleCase(`${firstWord} ${last}${middle}`);
}

function toTitleCase(s: string): string {
  return s
    .split(/(\s+|-)/)
    .map((part) => {
      if (!part || /^\s+$/.test(part) || part === "-") return part;
      if (/^[A-Z]\.?$/i.test(part)) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

function normalizeParty(raw: string | undefined): {
  code: CandidateParty;
  label: string;
} {
  const p = (raw || "").toUpperCase().trim();
  if (p === "DEM" || p === "DFL") return { code: "D", label: "Democratic" };
  if (p === "REP") return { code: "R", label: "Republican" };
  if (p === "IND" || p === "INDEPENDENT")
    return { code: "I", label: "Independent" };
  if (p === "LIB") return { code: "L", label: "Libertarian" };
  if (p === "GRE") return { code: "G", label: "Green" };
  return { code: "Other", label: raw || "Other" };
}

function normalizeChallenge(
  raw: string | undefined
): CandidateChallengeRole {
  if (raw === "I") return "Incumbent";
  if (raw === "C") return "Challenger";
  if (raw === "O") return "Open seat";
  return "Unknown";
}

// Active federal election cycle. For House (2-year terms) and one-third
// of Senate seats, this is the next even year. Senators not up for
// re-election this cycle simply don't appear in the result set.
function getActiveCycle(): number {
  const now = new Date().getUTCFullYear();
  return now % 2 === 0 ? now : now + 1;
}

// ─── Per-state cache ────────────────────────────────────────────────────

type StateCacheEntry = {
  cycle: number;
  candidates: Candidate[];
  fetchedAt: number;
};

// Map<stateUpper, Promise<StateCacheEntry>>. Promises are stored (not
// resolved entries) so concurrent requests for the same state share a
// single in-flight fetch — the second request awaits the first, the
// first populates the cache.
const stateCache = new Map<string, Promise<StateCacheEntry>>();

async function fetchPage(opts: {
  state: string;
  cycle: number;
  page: number;
  apiKey: string;
}): Promise<FecCandidatesResponse> {
  const url = new URL(`${FEC_BASE}/candidates/search/`);
  url.searchParams.set("api_key", opts.apiKey);
  url.searchParams.set("state", opts.state);
  url.searchParams.set("election_year", String(opts.cycle));
  url.searchParams.set("candidate_status", "C");
  url.searchParams.set("has_raised_funds", "true");
  url.searchParams.append("office", "H");
  url.searchParams.append("office", "S");
  url.searchParams.set("per_page", "100");
  url.searchParams.set("page", String(opts.page));
  url.searchParams.set("sort", "name");
  const res = await fetch(url.toString(), {
    next: { revalidate: 43200 }, // 12h cache via Next route layer
  });
  if (!res.ok) {
    throw new Error(
      `FEC candidates search ${opts.state} p${opts.page} HTTP ${res.status}`
    );
  }
  return (await res.json()) as FecCandidatesResponse;
}

async function fetchCandidatesForState(
  state: string,
  cycle: number
): Promise<Candidate[]> {
  const apiKey = getApiKey();
  const allRows: FecRawCandidate[] = [];
  let page = 1;
  for (;;) {
    const resp = await fetchPage({ state, cycle, page, apiKey });
    const rows = resp.results ?? [];
    allRows.push(...rows);
    const totalPages = resp.pagination?.pages ?? 1;
    if (page >= totalPages) break;
    if (page >= 5) break; // safety bound: 500 candidates per state is plenty
    page += 1;
  }

  const normalized: Candidate[] = [];
  for (const r of allRows) {
    const fecId = r.candidate_id;
    if (!fecId) continue;
    if (r.office !== "H" && r.office !== "S") continue;
    if (r.candidate_inactive) continue;
    const role = normalizeChallenge(r.incumbent_challenge);
    // Incumbents are already in the main legislator roster; this
    // section is specifically the "people running AGAINST them" view.
    if (role === "Incumbent") continue;
    const party = normalizeParty(r.party);
    const principal = r.principal_committees?.[0];
    normalized.push({
      fecId,
      name: reformatName(r.name),
      rawName: r.name || "",
      office: r.office === "S" ? "Senate" : "House",
      state: state.toUpperCase(),
      district:
        r.office === "H" && typeof r.district_number === "number"
          ? r.district_number
          : null,
      party: party.code,
      partyLabel: party.label,
      challengeRole: role,
      // FEC's election_years may contain multiple cycles for a candidate
      // whose committee spans elections (e.g. someone who ran 2024 and
      // re-filed for 2026). When the cycle we're filtering for is present,
      // surface that one — otherwise fall back to the most recent.
      electionYear:
        r.election_years?.includes(cycle)
          ? cycle
          : (r.election_years && r.election_years.length > 0
              ? Math.max(...r.election_years)
              : cycle),
      principalCommitteeId: principal?.committee_id || null,
      principalCommitteeName: principal?.name || null,
      firstFiled: r.first_file_date || null,
    });
  }
  // Senate first, then House by district, then alphabetical within tie.
  normalized.sort((a, b) => {
    if (a.office !== b.office) return a.office === "Senate" ? -1 : 1;
    const aDist = a.district ?? 999;
    const bDist = b.district ?? 999;
    if (aDist !== bDist) return aDist - bDist;
    return a.name.localeCompare(b.name);
  });
  return normalized;
}

// ─── Public API ─────────────────────────────────────────────────────────

export type CandidatesReport = {
  state: string;
  cycle: number;
  senateCandidates: Candidate[];
  houseCandidates: Candidate[];
  total: number;
};

export async function getCandidatesByState(
  state: string
): Promise<CandidatesReport> {
  const normalizedState = state.toUpperCase();
  const cycle = getActiveCycle();
  const cacheKey = `${normalizedState}|${cycle}`;

  let pending = stateCache.get(cacheKey);
  if (!pending) {
    pending = (async () => {
      try {
        const candidates = await fetchCandidatesForState(
          normalizedState,
          cycle
        );
        return { cycle, candidates, fetchedAt: Date.now() };
      } catch (err) {
        // On failure, evict so the next call retries instead of serving
        // the rejected promise forever.
        stateCache.delete(cacheKey);
        throw err;
      }
    })();
    stateCache.set(cacheKey, pending);
  }

  const entry = await pending;
  const senateCandidates = entry.candidates.filter(
    (c) => c.office === "Senate"
  );
  const houseCandidates = entry.candidates.filter(
    (c) => c.office === "House"
  );
  return {
    state: normalizedState,
    cycle: entry.cycle,
    senateCandidates,
    houseCandidates,
    total: entry.candidates.length,
  };
}
