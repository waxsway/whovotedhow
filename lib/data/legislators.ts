// Fetch + normalize current US Congress members from the
// unitedstates/congress-legislators project. Free, public, no API key,
// no rate limit. The data is community-maintained from official sources
// (bioguide.house.gov, senate.gov, house.gov) and refreshed continuously.
//
// Source repo: https://github.com/unitedstates/congress-legislators
// Canonical file: legislators-current.yaml on the main branch.
//
// (Historical note: the project also hosted a generated JSON mirror at
// theunitedstates.io/congress-legislators/legislators-current.json, but
// that endpoint is currently returning 403/410 — we parse YAML directly
// from GitHub raw so we don't depend on a third-party mirror.)
//
// Each legislator's bioguide id also keys an official portrait at
// theunitedstates.io/images/congress/{size}/{bioguide}.jpg. Portraits are
// rendered with an onError fallback so a single missing or unreachable
// portrait doesn't break a row.

// Data source: the unitedstates/congress-legislators GitHub repo, fetched
// from the raw content CDN. Only the YAML form is committed upstream.
const LEGISLATORS_URL =
  "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml";

// Portraits come from the github raw mirror of the unitedstates/images
// project (gh-pages branch). The original theunitedstates.io image CDN
// went 403 sometime in 2026 so we route through GitHub raw instead, which
// is reliably CORS-friendly and serves the same files. Each <img> tag in
// the panel wraps an onError fallback so a single missing portrait
// doesn't break a row.
const PORTRAIT_BASE =
  "https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress";

export type Party = "D" | "R" | "I" | "Other";
export type Chamber = "Senate" | "House";

export type Legislator = {
  bioguide: string;
  fullName: string;
  firstName: string;
  lastName: string;
  party: Party;
  chamber: Chamber;
  state: string; // 2-letter USPS code
  district: number | null; // null for senators, "0" for at-large reps normalized to null
  senateClass: number | null; // 1, 2, or 3 for senators; null for reps
  termStart: string; // ISO date of current term start
  termEnd: string; // ISO date of current term end
  portraitUrl: string; // 225x275 default; .replace("/225x275/", "/450x550/") for larger
  // FEC candidate IDs for this person across their career (most recent first
  // after normalization). H-prefix = House campaign, S-prefix = Senate. Used
  // by the donor pipeline to look up a member's principal campaign committee.
  fecIds: string[];
};

// Raw record shape from legislators-current.json. We type only the fields we
// actually consume and stay loose on the rest so a schema bump upstream
// doesn't break us.
type RawId = {
  bioguide?: string;
  fec?: string[];
};

type RawName = {
  first?: string;
  last?: string;
  official_full?: string;
};

type RawTerm = {
  type?: "sen" | "rep";
  state?: string;
  district?: number;
  party?: string;
  start?: string;
  end?: string;
  class?: number;
};

type RawLegislator = {
  id?: RawId;
  name?: RawName;
  terms?: RawTerm[];
};

function normalizeParty(raw: string | undefined): Party {
  const p = (raw || "").trim();
  if (p === "Democrat") return "D";
  if (p === "Republican") return "R";
  if (p === "Independent") return "I";
  return "Other";
}

function buildPortraitUrl(bioguide: string): string {
  return `${PORTRAIT_BASE}/225x275/${bioguide}.jpg`;
}

function normalize(raw: RawLegislator): Legislator | null {
  const bioguide = raw.id?.bioguide;
  if (!bioguide) return null;

  // The most recent term is the current one — sort descending by start date.
  const terms = (raw.terms || []).slice().sort((a, b) => {
    const aStart = a.start || "";
    const bStart = b.start || "";
    return bStart.localeCompare(aStart);
  });
  const currentTerm = terms[0];
  if (!currentTerm) return null;

  const chamber: Chamber = currentTerm.type === "sen" ? "Senate" : "House";
  const state = (currentTerm.state || "").toUpperCase();
  if (!state) return null;

  const firstName = (raw.name?.first || "").trim();
  const lastName = (raw.name?.last || "").trim();
  const fullName =
    (raw.name?.official_full || `${firstName} ${lastName}`).trim();

  // At-large House reps are coded district "0" upstream — collapse to null so
  // the UI can render "At-large" instead of "District 0".
  const districtRaw = currentTerm.district;
  const district =
    chamber === "House" && typeof districtRaw === "number" && districtRaw > 0
      ? districtRaw
      : null;

  // Sort FEC IDs so the chamber matching the current seat comes first; the
  // donor lookup will iterate this list trying each id until one resolves to
  // a principal campaign committee.
  const fecIds = Array.isArray(raw.id?.fec) ? raw.id!.fec.slice() : [];
  const chamberPrefix = chamber === "Senate" ? "S" : "H";
  fecIds.sort((a, b) => {
    const aMatch = a.startsWith(chamberPrefix) ? 0 : 1;
    const bMatch = b.startsWith(chamberPrefix) ? 0 : 1;
    return aMatch - bMatch;
  });

  return {
    bioguide,
    fullName,
    firstName,
    lastName,
    party: normalizeParty(currentTerm.party),
    chamber,
    state,
    district,
    senateClass:
      chamber === "Senate" && typeof currentTerm.class === "number"
        ? currentTerm.class
        : null,
    termStart: currentTerm.start || "",
    termEnd: currentTerm.end || "",
    portraitUrl: buildPortraitUrl(bioguide),
    fecIds,
  };
}

export async function fetchCurrentLegislators(): Promise<Legislator[]> {
  let res: Response;
  try {
    res = await fetch(LEGISLATORS_URL);
  } catch (err) {
    console.error("[legislators] network fetch failed:", err);
    throw new Error(
      `Network error fetching legislator roster (${LEGISLATORS_URL})`
    );
  }
  if (!res.ok) {
    console.error("[legislators] HTTP non-2xx:", res.status, res.statusText);
    throw new Error(
      `HTTP ${res.status} ${res.statusText} from legislator roster source`
    );
  }
  const yamlText = await res.text();
  // Dynamic import keeps js-yaml out of the initial client bundle until the
  // first fetch fires; the YAML payload is ~1 MB so the marginal parser
  // cost is acceptable next to network time.
  const { load } = await import("js-yaml");
  const raw = load(yamlText) as RawLegislator[];
  if (!Array.isArray(raw)) {
    throw new Error("Unexpected legislator roster shape (not an array)");
  }
  const normalized: Legislator[] = [];
  for (const r of raw) {
    const n = normalize(r);
    if (n) normalized.push(n);
  }
  return normalized;
}

export type LegislatorsByState = Map<string, Legislator[]>;

export function groupByState(legislators: Legislator[]): LegislatorsByState {
  const out: LegislatorsByState = new Map();
  for (const leg of legislators) {
    const bucket = out.get(leg.state);
    if (bucket) bucket.push(leg);
    else out.set(leg.state, [leg]);
  }
  // Within each state, sort: Senators first, then House by district.
  for (const bucket of out.values()) {
    bucket.sort((a, b) => {
      if (a.chamber !== b.chamber) {
        return a.chamber === "Senate" ? -1 : 1;
      }
      if (a.chamber === "Senate") {
        return (a.senateClass ?? 99) - (b.senateClass ?? 99);
      }
      return (a.district ?? 999) - (b.district ?? 999);
    });
  }
  return out;
}

export const PARTY_COLORS: Record<Party, string> = {
  D: "#3b82f6", // blue-500
  R: "#ef4444", // red-500
  I: "#a855f7", // purple-500
  Other: "#94a3b8", // slate-400
};
