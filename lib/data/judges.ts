// Federal Article III judges by state. Currently-serving district,
// circuit, and Supreme Court judges with the appointing president,
// party of the appointing president, and confirmation/commission
// dates so voters can see who's actually deciding cases in their
// state and which administration appointed them.
//
// Data source: Federal Judicial Center.
//   https://www.fjc.gov/sites/default/files/history/federal-judicial-service.csv
//
// One row per appointment (a judge who later elevated from district
// to circuit shows up twice with different Sequence numbers). We
// keep only the most recent appointment per judge that hasn't been
// terminated.
//
// Court → state mapping:
//   - District courts: state extracted from "District of {State}" or
//     "{Direction} District of {State}".
//   - Circuit courts: each circuit covers a known set of states
//     (CIRCUIT_STATES below). Same judge appears in every state of
//     their circuit.
//   - Supreme Court: returned separately by the API — every state
//     panel can show them as a national group if it wants to.

import Papa from "papaparse";

const FJC_SERVICE_URL =
  "https://www.fjc.gov/sites/default/files/history/federal-judicial-service.csv";

// ─── Raw row shape ──────────────────────────────────────────────────────

type FjcServiceRow = {
  nid?: string;
  Sequence?: string;
  "Judge Name"?: string;
  "Court Type"?: string;
  "Court Name"?: string;
  "Appointment Title"?: string;
  "Appointing President"?: string;
  "Party of Appointing President"?: string;
  "ABA Rating"?: string;
  "Nomination Date"?: string;
  "Confirmation Date"?: string;
  "Commission Date"?: string;
  "Senior Status Date"?: string;
  Termination?: string;
  "Termination Date"?: string;
};

// ─── Normalized shape we expose ─────────────────────────────────────────

export type JudgeAppointingParty =
  | "Democratic"
  | "Republican"
  | "Federalist"
  | "Whig"
  | "Other";

export type JudgeStatus = "Active" | "Senior";

export type JudgeCourtKind = "District" | "Circuit" | "Supreme";

export type Judge = {
  nid: string;
  fullName: string; // "First Last" display form
  rawName: string; // "Last, First [Middle]" from FJC
  courtKind: JudgeCourtKind;
  courtName: string;
  appointmentTitle: string; // "Judge", "Chief Judge", "Associate Justice", ...
  appointingPresident: string;
  appointingParty: JudgeAppointingParty;
  appointingPartyLabel: string; // raw party label
  abaRating: string | null;
  confirmationDate: string | null; // ISO
  commissionDate: string | null; // ISO
  seniorStatusDate: string | null; // ISO; if non-null they're on senior status
  status: JudgeStatus;
};

// ─── Circuit → states mapping ───────────────────────────────────────────

const CIRCUIT_STATES: Record<string, string[]> = {
  First: ["ME", "MA", "NH", "RI", "PR"],
  Second: ["CT", "NY", "VT"],
  Third: ["DE", "NJ", "PA", "VI"],
  Fourth: ["MD", "NC", "SC", "VA", "WV"],
  Fifth: ["LA", "MS", "TX"],
  Sixth: ["KY", "MI", "OH", "TN"],
  Seventh: ["IL", "IN", "WI"],
  Eighth: ["AR", "IA", "MN", "MO", "NE", "ND", "SD"],
  Ninth: ["AK", "AZ", "CA", "HI", "ID", "MT", "NV", "OR", "WA", "GU", "MP"],
  Tenth: ["CO", "KS", "NM", "OK", "UT", "WY"],
  Eleventh: ["AL", "FL", "GA"],
  // The DC Circuit hears federal admin / regulatory appeals — its
  // "state" is the District of Columbia for our purposes.
  "District of Columbia": ["DC"],
  // The Federal Circuit hears nationwide subject-matter cases (patent,
  // veterans, etc.) — surface it under DC since that's where it sits.
  Federal: ["DC"],
};

// ─── State name → 2-letter code ─────────────────────────────────────────

const STATE_NAME_TO_CODE: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
  "Puerto Rico": "PR",
  Guam: "GU",
  "Northern Mariana Islands": "MP",
  "Virgin Islands": "VI",
};

// ─── Helpers ────────────────────────────────────────────────────────────

function reformatName(raw: string | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const commaIdx = trimmed.indexOf(",");
  if (commaIdx === -1) return trimmed;
  const last = trimmed.slice(0, commaIdx).trim();
  const rest = trimmed.slice(commaIdx + 1).trim();
  return `${rest} ${last}`.trim();
}

function classifyCourt(courtType: string | undefined): JudgeCourtKind | null {
  if (!courtType) return null;
  const t = courtType.trim();
  if (t === "U.S. District Court") return "District";
  if (t === "U.S. Court of Appeals") return "Circuit";
  if (t === "Supreme Court of the United States") return "Supreme";
  return null;
}

function parseDistrictState(courtName: string): string | null {
  // Match "District of {State}" — handles "District of Maryland",
  // "Eastern District of New York", "Western District of Virginia", etc.
  const match = /District of (?:the )?(.+?)(?:\s+\(|$)/i.exec(courtName);
  if (!match) return null;
  const name = match[1].trim();
  // Handle "Columbia" → "District of Columbia" case where the prefix
  // wasn't captured because the literal "District of Columbia" reads
  // ambiguously with the regex above.
  if (name === "Columbia") return "DC";
  return STATE_NAME_TO_CODE[name] ?? null;
}

function parseCircuitStates(courtName: string): string[] {
  // Match "{Ordinal} Circuit" or "District of Columbia Circuit" or "Federal Circuit"
  for (const circuit of Object.keys(CIRCUIT_STATES)) {
    const pattern = new RegExp(`\\b${circuit}\\b Circuit`, "i");
    if (pattern.test(courtName)) return CIRCUIT_STATES[circuit];
  }
  return [];
}

function isCurrentlyServing(row: FjcServiceRow): boolean {
  const termination = (row.Termination || "").trim();
  const terminationDate = (row["Termination Date"] || "").trim();
  // A judge is currently serving if there's no termination entry at all.
  // Senior status alone is NOT termination — those judges still hear cases.
  if (!termination && !terminationDate) return true;
  // Some rows have Termination filled in but no date — treat as terminated.
  return false;
}

function determineStatus(row: FjcServiceRow): JudgeStatus {
  const senior = (row["Senior Status Date"] || "").trim();
  return senior ? "Senior" : "Active";
}

function normalizeParty(raw: string | undefined): {
  code: JudgeAppointingParty;
  label: string;
} {
  const p = (raw || "").trim();
  if (p === "Democratic") return { code: "Democratic", label: "Democratic" };
  if (p === "Republican") return { code: "Republican", label: "Republican" };
  if (p === "Federalist") return { code: "Federalist", label: "Federalist" };
  if (p === "Whig") return { code: "Whig", label: "Whig" };
  return { code: "Other", label: p || "Unknown" };
}

function isoOrNull(raw: string | undefined): string | null {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;
  return trimmed;
}

// ─── Cache ──────────────────────────────────────────────────────────────

type JudgesIndex = {
  // state code → district judges sitting in that state's federal courts
  districtByState: Map<string, Judge[]>;
  // state code → circuit judges whose circuit covers this state
  circuitByState: Map<string, Judge[]>;
  // Supreme Court justices currently serving (national)
  supreme: Judge[];
  fetchedAt: number;
};

let judgesIndexPromise: Promise<JudgesIndex> | null = null;

async function fetchJudgesIndex(): Promise<JudgesIndex> {
  const res = await fetch(FJC_SERVICE_URL, {
    next: { revalidate: 604800 }, // 7 days: judicial appointments don't change daily
  });
  if (!res.ok) {
    throw new Error(
      `FJC service CSV fetch failed: HTTP ${res.status}`
    );
  }
  const csv = await res.text();
  const parsed = Papa.parse<FjcServiceRow>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  // Group active rows by nid → keep only the most recent appointment
  // per judge (Sequence is monotonic within nid).
  const latestByJudge = new Map<string, FjcServiceRow>();
  for (const row of parsed.data) {
    const nid = (row.nid || "").trim();
    if (!nid) continue;
    if (!isCurrentlyServing(row)) continue;
    const courtKind = classifyCourt(row["Court Type"]);
    if (!courtKind) continue;
    const seq = parseInt((row.Sequence || "0").trim(), 10) || 0;
    const existing = latestByJudge.get(nid);
    if (!existing) {
      latestByJudge.set(nid, row);
      continue;
    }
    const existingSeq = parseInt((existing.Sequence || "0").trim(), 10) || 0;
    if (seq > existingSeq) latestByJudge.set(nid, row);
  }

  const districtByState = new Map<string, Judge[]>();
  const circuitByState = new Map<string, Judge[]>();
  const supreme: Judge[] = [];

  for (const row of latestByJudge.values()) {
    const courtKind = classifyCourt(row["Court Type"]);
    if (!courtKind) continue;
    const courtName = (row["Court Name"] || "").trim();
    const party = normalizeParty(row["Party of Appointing President"]);
    const judge: Judge = {
      nid: (row.nid || "").trim(),
      fullName: reformatName(row["Judge Name"]),
      rawName: (row["Judge Name"] || "").trim(),
      courtKind,
      courtName,
      appointmentTitle: (row["Appointment Title"] || "").trim() || "Judge",
      appointingPresident: (row["Appointing President"] || "").trim(),
      appointingParty: party.code,
      appointingPartyLabel: party.label,
      abaRating: (row["ABA Rating"] || "").trim() || null,
      confirmationDate: isoOrNull(row["Confirmation Date"]),
      commissionDate: isoOrNull(row["Commission Date"]),
      seniorStatusDate: isoOrNull(row["Senior Status Date"]),
      status: determineStatus(row),
    };

    if (courtKind === "District") {
      const stateCode = parseDistrictState(courtName);
      if (!stateCode) continue;
      const bucket = districtByState.get(stateCode);
      if (bucket) bucket.push(judge);
      else districtByState.set(stateCode, [judge]);
    } else if (courtKind === "Circuit") {
      const stateCodes = parseCircuitStates(courtName);
      for (const code of stateCodes) {
        const bucket = circuitByState.get(code);
        if (bucket) bucket.push(judge);
        else circuitByState.set(code, [judge]);
      }
    } else if (courtKind === "Supreme") {
      supreme.push(judge);
    }
  }

  // Within each state, sort by commission date desc so newest appointments
  // appear first (easier to spot recent ideological shifts on a court).
  const sortByCommissionDesc = (a: Judge, b: Judge) => {
    const aDate = a.commissionDate || "";
    const bDate = b.commissionDate || "";
    return aDate < bDate ? 1 : -1;
  };
  for (const arr of districtByState.values()) arr.sort(sortByCommissionDesc);
  for (const arr of circuitByState.values()) arr.sort(sortByCommissionDesc);
  supreme.sort(sortByCommissionDesc);

  return {
    districtByState,
    circuitByState,
    supreme,
    fetchedAt: Date.now(),
  };
}

async function loadJudgesIndex(): Promise<JudgesIndex> {
  if (!judgesIndexPromise) {
    judgesIndexPromise = fetchJudgesIndex().catch((err) => {
      judgesIndexPromise = null;
      throw err;
    });
  }
  return judgesIndexPromise;
}

// ─── Public API ─────────────────────────────────────────────────────────

export type JudgesReport = {
  state: string;
  districtJudges: Judge[];
  circuitJudges: Judge[];
  supremeJustices: Judge[];
};

export async function getJudgesByState(state: string): Promise<JudgesReport> {
  const code = state.toUpperCase();
  const idx = await loadJudgesIndex();
  return {
    state: code,
    districtJudges: idx.districtByState.get(code) ?? [],
    circuitJudges: idx.circuitByState.get(code) ?? [],
    supremeJustices: idx.supreme,
  };
}
