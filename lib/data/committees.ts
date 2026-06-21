// Committee assignments per legislator. This is where members actually
// wield power — being on Senate Banking or House Ways & Means matters
// far more on legislation in those domains than the floor-vote record
// alone reveals. It also contextualizes donor data: a senator on
// Banking who takes heavy donations from JPMorgan is doing something
// different than a senator on Agriculture who does the same.
//
// Data source: the unitedstates/congress-legislators project on GitHub
// (same source we already use for the legislator roster). Two YAML
// files keyed on Thomas IDs:
//   - committees-current.yaml: full committee metadata (name, url,
//     jurisdiction, and a nested subcommittees array)
//   - committee-membership-current.yaml: top-level keys are Thomas IDs
//     pointing to arrays of {name, bioguide, party (majority|minority),
//     rank, title?} member entries
//
// Subcommittee keys are formed by concatenating the parent committee
// Thomas ID with the subcommittee's own Thomas ID, e.g. SSAF + 13
// → SSAF13 (Senate Agriculture, Subcommittee on Commodities, Risk
// Management, and Trade).

const COMMITTEES_URL =
  "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/committees-current.yaml";
const MEMBERSHIP_URL =
  "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/committee-membership-current.yaml";

// ─── Raw upstream shapes ────────────────────────────────────────────────

type RawSubcommittee = {
  name?: string;
  thomas_id?: string;
  address?: string;
  phone?: string;
};

type RawCommittee = {
  type?: "house" | "senate" | "joint";
  name?: string;
  url?: string;
  thomas_id?: string;
  jurisdiction?: string;
  subcommittees?: RawSubcommittee[];
};

type RawMember = {
  name?: string;
  party?: "majority" | "minority";
  rank?: number;
  title?: string;
  bioguide?: string;
};

type RawMembership = Record<string, RawMember[]>;

// ─── Normalized shape we expose ─────────────────────────────────────────

export type CommitteeAssignmentSide = "majority" | "minority";

export type CommitteeAssignmentRole =
  | "Chair"
  | "Ranking Member"
  | "Vice Chair"
  | "Member";

export type CommitteeChamber = "House" | "Senate" | "Joint";

export type CommitteeAssignment = {
  // Thomas ID — uniquely identifies this committee or subcommittee in
  // the unitedstates data.
  thomasId: string;
  committeeName: string; // "Senate Committee on Banking, Housing, and Urban Affairs"
  parentCommitteeName: string | null; // null for full committees; set for subs
  parentThomasId: string | null;
  isSubcommittee: boolean;
  chamber: CommitteeChamber;
  side: CommitteeAssignmentSide;
  role: CommitteeAssignmentRole;
  rawTitle: string | null; // original title string ("Chairman", "Ranking Member", etc.)
  rank: number; // position within their party caucus on the committee
  committeeUrl: string | null; // official committee URL
  jurisdiction: string | null; // only set for full committees
};

// ─── Title normalization ────────────────────────────────────────────────

function normalizeRole(rawTitle: string | undefined): {
  role: CommitteeAssignmentRole;
  raw: string | null;
} {
  const t = (rawTitle || "").trim();
  if (!t) return { role: "Member", raw: null };
  // Different titles across chambers: "Chair", "Chairman", "Chairwoman",
  // "Ranking Member", "Ranking", "Vice Chair", etc. Normalize.
  const lower = t.toLowerCase();
  if (lower.startsWith("chair") || lower === "chairman" || lower === "chairwoman")
    return { role: "Chair", raw: t };
  if (lower.includes("ranking"))
    return { role: "Ranking Member", raw: t };
  if (lower.startsWith("vice")) return { role: "Vice Chair", raw: t };
  return { role: "Member", raw: t };
}

function chamberFromCommitteeType(
  type: string | undefined
): CommitteeChamber {
  if (type === "senate") return "Senate";
  if (type === "joint") return "Joint";
  return "House";
}

// ─── Cache ──────────────────────────────────────────────────────────────

type CommitteesIndex = {
  byBioguide: Map<string, CommitteeAssignment[]>;
  fetchedAt: number;
};

let committeesIndexPromise: Promise<CommitteesIndex> | null = null;

async function fetchYaml<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    next: { revalidate: 86400 }, // 24h: committee rosters shift occasionally
  });
  if (!res.ok) {
    throw new Error(`Committees fetch ${url} failed: HTTP ${res.status}`);
  }
  const text = await res.text();
  const { load } = await import("js-yaml");
  return load(text) as T;
}

async function buildIndex(): Promise<CommitteesIndex> {
  const [committees, membership] = await Promise.all([
    fetchYaml<RawCommittee[]>(COMMITTEES_URL),
    fetchYaml<RawMembership>(MEMBERSHIP_URL),
  ]);

  // Build a Thomas ID → committee metadata lookup table that includes
  // both full committees AND subcommittees (subcommittees keyed by
  // parent_thomas_id + subcommittee_thomas_id).
  type ResolvedCommittee = {
    thomasId: string;
    committeeName: string;
    parentCommitteeName: string | null;
    parentThomasId: string | null;
    isSubcommittee: boolean;
    chamber: CommitteeChamber;
    committeeUrl: string | null;
    jurisdiction: string | null;
  };
  const committeeByThomasId = new Map<string, ResolvedCommittee>();

  for (const c of committees) {
    const tid = (c.thomas_id || "").trim();
    if (!tid) continue;
    const chamber = chamberFromCommitteeType(c.type);
    const name = (c.name || "").trim();
    committeeByThomasId.set(tid, {
      thomasId: tid,
      committeeName: name,
      parentCommitteeName: null,
      parentThomasId: null,
      isSubcommittee: false,
      chamber,
      committeeUrl: (c.url || "").trim() || null,
      jurisdiction: (c.jurisdiction || "").trim() || null,
    });

    for (const sub of c.subcommittees || []) {
      const subTid = (sub.thomas_id || "").trim();
      if (!subTid) continue;
      const fullSubKey = `${tid}${subTid}`;
      committeeByThomasId.set(fullSubKey, {
        thomasId: fullSubKey,
        committeeName: `Subcommittee on ${(sub.name || "").trim()}`,
        parentCommitteeName: name,
        parentThomasId: tid,
        isSubcommittee: true,
        chamber,
        committeeUrl: null, // subcommittees rarely have separate URLs in this file
        jurisdiction: null,
      });
    }
  }

  // Walk the membership index. For each committee/subcommittee, iterate
  // its members and append a CommitteeAssignment under each bioguide.
  const byBioguide = new Map<string, CommitteeAssignment[]>();
  for (const [thomasId, members] of Object.entries(membership)) {
    const meta = committeeByThomasId.get(thomasId);
    if (!meta) continue; // membership references unknown committee — skip
    if (!Array.isArray(members)) continue;
    for (const m of members) {
      const bioguide = (m.bioguide || "").trim();
      if (!bioguide) continue;
      const side: CommitteeAssignmentSide =
        m.party === "minority" ? "minority" : "majority";
      const { role, raw } = normalizeRole(m.title);
      const assignment: CommitteeAssignment = {
        thomasId,
        committeeName: meta.committeeName,
        parentCommitteeName: meta.parentCommitteeName,
        parentThomasId: meta.parentThomasId,
        isSubcommittee: meta.isSubcommittee,
        chamber: meta.chamber,
        side,
        role,
        rawTitle: raw,
        rank: typeof m.rank === "number" ? m.rank : 999,
        committeeUrl: meta.committeeUrl,
        jurisdiction: meta.jurisdiction,
      };
      const bucket = byBioguide.get(bioguide);
      if (bucket) bucket.push(assignment);
      else byBioguide.set(bioguide, [assignment]);
    }
  }

  // For each member: sort full committees before subcommittees, then
  // by role (Chair > Ranking > Vice > Member), then by parent committee
  // name so subcommittees cluster under their parent.
  const roleWeight: Record<CommitteeAssignmentRole, number> = {
    Chair: 0,
    "Ranking Member": 1,
    "Vice Chair": 2,
    Member: 3,
  };
  for (const arr of byBioguide.values()) {
    arr.sort((a, b) => {
      // Group: full committees first, then subcommittees under their parent
      if (a.isSubcommittee !== b.isSubcommittee) {
        return a.isSubcommittee ? 1 : -1;
      }
      // Promote chairs and ranking members to the top
      if (roleWeight[a.role] !== roleWeight[b.role]) {
        return roleWeight[a.role] - roleWeight[b.role];
      }
      // Then alphabetical by committee/parent name for stable ordering
      const aKey = a.isSubcommittee
        ? `${a.parentCommitteeName || ""}|${a.committeeName}`
        : a.committeeName;
      const bKey = b.isSubcommittee
        ? `${b.parentCommitteeName || ""}|${b.committeeName}`
        : b.committeeName;
      return aKey.localeCompare(bKey);
    });
  }

  return { byBioguide, fetchedAt: Date.now() };
}

async function loadCommitteesIndex(): Promise<CommitteesIndex> {
  if (!committeesIndexPromise) {
    committeesIndexPromise = buildIndex().catch((err) => {
      committeesIndexPromise = null;
      throw err;
    });
  }
  return committeesIndexPromise;
}

// ─── Public API ─────────────────────────────────────────────────────────

export type CommitteesReport = {
  bioguide: string;
  fullCommittees: CommitteeAssignment[];
  subcommittees: CommitteeAssignment[];
  // Convenience: any committee where this member holds Chair / Ranking
  // / Vice Chair — leadership positions worth surfacing prominently.
  leadership: CommitteeAssignment[];
  total: number;
};

export async function getCommitteesByBioguide(
  bioguide: string
): Promise<CommitteesReport> {
  const idx = await loadCommitteesIndex();
  const assignments = idx.byBioguide.get(bioguide) ?? [];
  const fullCommittees = assignments.filter((a) => !a.isSubcommittee);
  const subcommittees = assignments.filter((a) => a.isSubcommittee);
  const leadership = assignments.filter((a) => a.role !== "Member");
  return {
    bioguide,
    fullCommittees,
    subcommittees,
    leadership,
    total: assignments.length,
  };
}
