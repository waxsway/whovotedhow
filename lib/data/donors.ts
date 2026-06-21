// Server-side FEC.gov client for the "top donors" bubble chart.
//
// Real public-record contribution data sourced directly from the FEC
// (Federal Election Commission). FEC publishes every itemized contribution
// every committee files — this client surfaces the aggregated "Top employers
// of individual donors" view per legislator. It is honest about the data
// shape: FEC's "Employer" field is donor-self-reported, so we filter out
// the junk values ("NOT EMPLOYED", "SELF", "RETIRED", "INFORMATION
// REQUESTED" etc.) and light-normalize the rest to merge near-duplicate
// company names (corporate-suffix stripping + uppercase fold).
//
// What this is NOT: the curated "Top Contributors" view from OpenSecrets
// which surfaces "Goldman Sachs gave $X" via hand-classified industry
// rollups. That requires manual data work OpenSecrets does. We use the
// federal source directly so the methodology is fully defensible against
// "you're cherry-picking" attacks.
//
// Endpoints used:
//   GET /v1/candidate/{candidate_id}/committees/?designation=P
//     -> Find the candidate's principal campaign committee
//   GET /v1/schedules/schedule_a/by_employer/?committee_id={committee_id}
//        &two_year_transaction_period={cycle}&per_page=100
//     -> Aggregated individual-contribution dollars by employer field

const FEC_BASE = "https://api.open.fec.gov/v1";

// FEC's by_employer endpoint surfaces whatever donors typed into the
// employer field on their FEC contribution form. Most of the top entries
// in raw data are these self-reported non-employer strings — not actual
// company donors. Filtering them out leaves us with real employer
// aggregations the analyst should see.
const EMPLOYER_JUNK = new Set([
  "",
  "NULL",
  "NONE",
  "N/A",
  "NA",
  "NOT EMPLOYED",
  "UNEMPLOYED",
  "NOT-EMPLOYED",
  "NOTEMPLOYED",
  "SELF",
  "SELF EMPLOYED",
  "SELF-EMPLOYED",
  "SELFEMPLOYED",
  "RETIRED",
  "HOMEMAKER",
  "INFORMATION REQUESTED",
  "INFO REQUESTED",
  "INFORMATION REQUESTED PER BEST EFFORTS",
  "REQUESTED",
  "NOT REQUIRED",
  "REFUSED",
  "DECLINED",
  "NOT APPLICABLE",
  "UNKNOWN",
  "UNDEFINED",
  "UNDISCLOSED",
]);

export type Donor = {
  // Canonical display name after normalization
  name: string;
  // Original FEC employer string(s) collapsed into this canonical name
  rawNames: string[];
  // Total individual contributions, USD, summed across the rawNames
  total: number;
  // Number of individual contribution records aggregated
  count: number;
};

export type DonorReport = {
  bioguide: string;
  fecCandidateId: string | null;
  committeeId: string | null;
  committeeName: string | null;
  cycle: number;
  source: "FEC";
  donors: Donor[];
  // Total dollars across the top-N donors we returned (NOT the candidate's
  // total fundraising — just the sum of what made it past our junk filter).
  topDonorsTotal: number;
  // Total raw dollars including junk entries, so analysts can see how much
  // of the candidate's individual contributions came from un-identifiable
  // employer reporting vs identifiable corporate donor aggregations.
  totalRawDollars: number;
  filteredJunkDollars: number;
  generatedAt: string;
};

type FecCommittee = {
  committee_id?: string;
  name?: string;
  designation?: string;
  committee_type?: string;
  cycles?: number[];
};

type FecCommitteesResponse = {
  results?: FecCommittee[];
};

type FecByEmployerRow = {
  committee_id?: string;
  employer?: string;
  cycle?: number;
  total?: number;
  count?: number;
};

type FecByEmployerResponse = {
  results?: FecByEmployerRow[];
};

function getApiKey(): string {
  const key = process.env.FEC_API_KEY;
  if (!key) {
    throw new Error(
      "FEC_API_KEY environment variable is not set. Get a free key at https://api.data.gov/signup/"
    );
  }
  return key;
}

async function fecFetch<T>(
  path: string,
  params: Record<string, string | number>
): Promise<T> {
  const url = new URL(`${FEC_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  url.searchParams.set("api_key", getApiKey());
  const res = await fetch(url.toString(), {
    next: { revalidate: 60 * 60 * 12 }, // 12h cache via Next route cache
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `FEC ${path} failed: HTTP ${res.status} ${res.statusText} ${body.slice(0, 200)}`
    );
  }
  return (await res.json()) as T;
}

// Find a candidate's principal campaign committee. Each candidate filing
// designates one Principal Campaign Committee (designation P); that's where
// itemized contributions land. Some candidates have multiple Senate /
// House campaigns over their career — fecIds is sorted with the chamber
// matching the current seat first.
async function findPrincipalCommittee(
  fecIds: string[]
): Promise<{ committeeId: string; committeeName: string; candidateId: string } | null> {
  for (const candidateId of fecIds) {
    try {
      const data = await fecFetch<FecCommitteesResponse>(
        `/candidate/${encodeURIComponent(candidateId)}/committees/`,
        { designation: "P", per_page: 5 }
      );
      const results = data.results ?? [];
      // Pick the most recent committee by latest cycle present.
      const best = results
        .slice()
        .sort((a, b) => {
          const aMax = Math.max(...(a.cycles ?? [0]));
          const bMax = Math.max(...(b.cycles ?? [0]));
          return bMax - aMax;
        })[0];
      if (best?.committee_id) {
        return {
          committeeId: best.committee_id,
          committeeName: (best.name ?? "").trim() || "Principal campaign committee",
          candidateId,
        };
      }
    } catch (err) {
      console.error(
        "[donors] principal committee lookup failed for",
        candidateId,
        err
      );
      // Try the next FEC id
    }
  }
  return null;
}

// Normalize a FEC employer string to a canonical form so near-duplicates merge.
// FEC's data is shouty (uppercase) and has lots of legal-suffix noise:
//   "GOLDMAN, SACHS & CO."     -> "GOLDMAN SACHS"
//   "GOLDMAN SACHS GROUP INC"   -> "GOLDMAN SACHS GROUP" -> "GOLDMAN SACHS"
//   "JPMORGAN CHASE & CO."      -> "JPMORGAN CHASE"
// This isn't perfect (OpenSecrets pays humans to do better), but it removes
// the most obvious near-dupes and produces shorter, cleaner labels.
function normalizeEmployer(raw: string): string {
  let s = raw.trim().toUpperCase();
  s = s.replace(/[.,]/g, " ");
  s = s.replace(/&/g, " AND ");
  s = s.replace(/\s+/g, " ").trim();
  // Strip trailing corporate suffixes
  const suffixRe =
    /\s+(INC|INCORPORATED|LLC|L\s*L\s*C|LLP|L\s*L\s*P|LP|L P|LTD|LIMITED|CORP|CORPORATION|CO|COMPANY|PLC|PC|PA|GROUP|HOLDINGS|HOLDING|INTERNATIONAL|INTL|GLOBAL|USA|US|NORTH AMERICA|NA|AMERICA|AMERICAS|ENTERPRISES|VENTURES|CAPITAL|PARTNERS|PARTNERSHIP|AND CO|AND COMPANY)$/;
  for (let i = 0; i < 4; i++) {
    const before = s;
    s = s.replace(suffixRe, "").trim();
    if (s === before) break;
  }
  return s;
}

// Display-case version of a normalized name. We keep proper acronyms
// uppercase (JPMORGAN -> JPMorgan-style we don't try; just title-case for
// readability while preserving short all-caps tokens like "AT", "AND").
function prettyCase(canonical: string): string {
  return canonical
    .split(" ")
    .filter((w) => w.length > 0)
    .map((w) => {
      if (w === "AND") return "&";
      if (w.length <= 3) return w; // keep "AT", "IBM", "USA", etc.
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

const TOP_N_DONORS = 25;

export async function getTopDonorsByBioguide(opts: {
  bioguide: string;
  fecIds: string[];
  cycle: number;
}): Promise<DonorReport> {
  const { bioguide, fecIds, cycle } = opts;

  const principal = await findPrincipalCommittee(fecIds);
  if (!principal) {
    return {
      bioguide,
      fecCandidateId: fecIds[0] ?? null,
      committeeId: null,
      committeeName: null,
      cycle,
      source: "FEC",
      donors: [],
      topDonorsTotal: 0,
      totalRawDollars: 0,
      filteredJunkDollars: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  // by_employer returns aggregated rows. per_page=100 captures the top
  // employers comfortably (after junk filtering we surface top 25). FEC
  // sorts ascending by default; we'll do the final sort ourselves after
  // dedupe+merge.
  const data = await fecFetch<FecByEmployerResponse>(
    "/schedules/schedule_a/by_employer/",
    {
      committee_id: principal.committeeId,
      two_year_transaction_period: cycle,
      per_page: 100,
    }
  );

  const rows = data.results ?? [];
  let totalRawDollars = 0;
  let filteredJunkDollars = 0;
  const merged = new Map<
    string,
    { name: string; rawNames: Set<string>; total: number; count: number }
  >();

  for (const row of rows) {
    const rawEmployer = (row.employer ?? "").trim();
    const total = Number(row.total ?? 0);
    const count = Number(row.count ?? 0);
    totalRawDollars += total;
    const upper = rawEmployer.toUpperCase();
    if (EMPLOYER_JUNK.has(upper)) {
      filteredJunkDollars += total;
      continue;
    }
    const canonical = normalizeEmployer(rawEmployer);
    if (!canonical) {
      filteredJunkDollars += total;
      continue;
    }
    const existing = merged.get(canonical);
    if (existing) {
      existing.total += total;
      existing.count += count;
      existing.rawNames.add(rawEmployer);
    } else {
      merged.set(canonical, {
        name: prettyCase(canonical),
        rawNames: new Set([rawEmployer]),
        total,
        count,
      });
    }
  }

  const donors: Donor[] = Array.from(merged.values())
    .map((m) => ({
      name: m.name,
      rawNames: Array.from(m.rawNames),
      total: Math.round(m.total * 100) / 100,
      count: m.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, TOP_N_DONORS);

  const topDonorsTotal = donors.reduce((acc, d) => acc + d.total, 0);

  return {
    bioguide,
    fecCandidateId: principal.candidateId,
    committeeId: principal.committeeId,
    committeeName: principal.committeeName,
    cycle,
    source: "FEC",
    donors,
    topDonorsTotal: Math.round(topDonorsTotal * 100) / 100,
    totalRawDollars: Math.round(totalRawDollars * 100) / 100,
    filteredJunkDollars: Math.round(filteredJunkDollars * 100) / 100,
    generatedAt: new Date().toISOString(),
  };
}
