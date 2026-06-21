// Curated registry of substantive roll-call votes tagged by issue.
//
// This replaces the previous keyword-matching approach for statement-vote
// alignment. Keyword matching was unreliable because Voteview's vote_desc
// field hides bill substance behind procedural language (e.g. "Cloture
// motion on H.R. 4521" with no climate keywords visible even though the
// bill is about climate).
//
// Methodology shift:
//   - Keyword matching: SCAN every recent vote, match any with issue
//     keywords. Noisy, catches procedural maneuvers that don't really
//     reflect a senator's position on the issue.
//   - Tagged rollcalls (THIS file): EXPLICITLY list the substantive
//     votes that matter per issue. Hand-curated. Clean. Defensible.
//
// Trade-off:
//   - Pro: every flagged vote is one we've vetted as substantive on the
//     issue. The "favors direction" is explicit, so procedural inversions
//     (motion-to-recommit = Yea kills the bill) are handled correctly.
//   - Con: limited coverage. We only score what's tagged. Untagged issues
//     show "no tagged votes yet" rather than misleading data.
//
// Registry growth: append entries below as new substantive votes happen
// or as we backfill from prior congresses. Voteview cache covers 118th
// and 119th congresses, so tagged votes outside that window are ignored
// until we expand the cache.

import type { IssueId } from "./positions";

export type TaggedRollcall = {
  congress: number;
  chamber: "Senate" | "House";
  // Bill number as Voteview stores it: no spaces, no periods.
  // "HR5376", "S2938", "HJRES7", "SRES13", etc.
  billNumber: string;
  // Optional: restrict to specific roll-call numbers when the bill had
  // multiple votes (procedural + passage) and we only want to count the
  // substantive ones. When omitted we accept ALL rollcalls referencing
  // the bill — caller filters by vote_question for substantiveness.
  rollnumbers?: number[];
  issueId: IssueId;
  // Which side of this specific vote advances the "favors" stance for the
  // issue. Defaults to "Yea" because most substantive bills, when passed,
  // advance the issue's "favors" direction. Use "Nay" for cases where the
  // bill itself was a regression (e.g. a bill restricting abortion rights:
  // voting Nay = opposing the restriction = supporting abortion rights).
  favorsDirection: "Yea" | "Nay";
  // Plain-language description of the bill, surfaced in the UI.
  description: string;
  // Optional canonical URL for the bill on congress.gov for reference.
  sourceUrl?: string;
};

// Substantive vote_question values from Voteview that represent
// position-defining moments. Used to filter out procedural noise
// (motions to recommit, motions to suspend rules, journal approvals,
// etc.) when we accept ALL rollcalls for a tagged bill.
export const SUBSTANTIVE_VOTE_QUESTIONS = new Set<string>([
  "On Passage of the Bill",
  "On Passage",
  "On Passage of the Act",
  "On the Conference Report",
  "On Cloture on the Motion to Proceed to the Bill",
  "On Cloture on the Bill",
  "On the Cloture Motion",
  "On the Cloture Motion to Proceed",
  "On the Motion (Motion to Concur)",
  "On the Motion to Concur in the House Amendment to the Senate Amendment",
  "On the Joint Resolution",
  "On Agreeing to the Resolution",
]);

export function isSubstantiveVoteQuestion(q: string | undefined): boolean {
  if (!q) return false;
  const trimmed = q.trim();
  if (SUBSTANTIVE_VOTE_QUESTIONS.has(trimmed)) return true;
  // Lightly fuzzy: passage / cloture variants we may not have enumerated.
  const lower = trimmed.toLowerCase();
  if (lower.includes("on passage")) return true;
  if (lower.startsWith("on the cloture motion")) return true;
  if (lower === "on cloture") return true;
  if (lower.includes("on the conference report")) return true;
  return false;
}

// Initial seed entries. Conservative — only landmark votes I'm confident
// about. Easy to add more: each new entry is a row below.
//
// IMPORTANT: these reference bill numbers in 118th and 119th Congress
// (the windows our Voteview cache loads). If a tagged bill number does
// not exist in the cache, the alignment engine simply yields "no
// matching tagged votes" for that issue and the UI shows the clean
// fallback state.
export const TAGGED_ROLLCALLS: TaggedRollcall[] = [
  // ── 118th Congress (2023–2025) ────────────────────────────────────────
  // S.866 — Border Act of 2024 (bipartisan border deal that failed)
  // Senate cloture, 2024-02-07
  {
    congress: 118,
    chamber: "Senate",
    billNumber: "S866",
    issueId: "immigration_reform",
    favorsDirection: "Yea",
    description:
      "Border Act of 2024 (bipartisan deal). Yea = support the package, including new border-enforcement funding plus immigration-reform provisions.",
    sourceUrl: "https://www.congress.gov/bill/118th-congress/senate-bill/866",
  },
  // H.R.2 — Secure the Border Act of 2023 (House Republican border bill)
  {
    congress: 118,
    chamber: "House",
    billNumber: "HR2",
    issueId: "immigration_reform",
    favorsDirection: "Nay",
    description:
      "Secure the Border Act of 2023. Bill restricts asylum and reduces immigration. Nay = opposing those restrictions (favors reform direction).",
    sourceUrl: "https://www.congress.gov/bill/118th-congress/house-bill/2",
  },
  // S.4382 — Right to Contraception Act (2024)
  {
    congress: 118,
    chamber: "Senate",
    billNumber: "S4382",
    issueId: "abortion_rights",
    favorsDirection: "Yea",
    description:
      "Right to Contraception Act 2024. Yea = supporting federal protections for contraception access (favors reproductive rights direction).",
    sourceUrl: "https://www.congress.gov/bill/118th-congress/senate-bill/4382",
  },
  // S.4445 — Right to IVF Act (2024)
  {
    congress: 118,
    chamber: "Senate",
    billNumber: "S4445",
    issueId: "abortion_rights",
    favorsDirection: "Yea",
    description:
      "Right to IVF Act 2024. Yea = supporting federal protections for in-vitro fertilization access (favors reproductive rights direction).",
    sourceUrl: "https://www.congress.gov/bill/118th-congress/senate-bill/4445",
  },
  // H.R.7888 — Reforming Intelligence and Securing America Act (FISA 702
  // reauth) — used as substantive vote for surveillance/security topic
  // not in our 5 issues yet; placeholder for future expansion.

  // S.J.RES.32 — Joint Resolution overturning EPA HD vehicle emissions rule
  // (2024). Voting Yea = repealing climate regulation; voting Nay =
  // preserving climate rule (favors climate action direction).
  {
    congress: 118,
    chamber: "Senate",
    billNumber: "SJRES32",
    issueId: "climate_action",
    favorsDirection: "Nay",
    description:
      "Resolution to overturn EPA heavy-duty vehicle emissions standard. Yea = repeal climate rule; Nay = preserve climate rule (favors climate action).",
    sourceUrl:
      "https://www.congress.gov/bill/118th-congress/senate-joint-resolution/32",
  },
  // H.R.6126 — Israel emergency aid (not in our 5 issues)

  // Inflation Reduction Act amendments / repeals
  // In 118th, multiple Republican amendments tried to roll back IRA
  // climate provisions. Each is its own roll call. We track major ones:

  // S.4072 — Border Supplemental Appropriations Act (2024 v2)
  {
    congress: 118,
    chamber: "Senate",
    billNumber: "S4072",
    issueId: "immigration_reform",
    favorsDirection: "Yea",
    description:
      "Border supplemental appropriations 2024 v2. Yea = support the package combining border enforcement with broader immigration relief.",
    sourceUrl: "https://www.congress.gov/bill/118th-congress/senate-bill/4072",
  },

  // ── 119th Congress (2025– ) ──────────────────────────────────────────
  // 119th is in early days; we'll backfill landmark votes as they happen.
  // Architecture note: simply append entries below as substantive votes
  // come through. The engine picks them up automatically once Voteview's
  // 119th cache catches the vote.
];

// Index for fast lookup by (issueId).
export function rollcallsForIssue(issueId: IssueId): TaggedRollcall[] {
  return TAGGED_ROLLCALLS.filter((rc) => rc.issueId === issueId);
}
