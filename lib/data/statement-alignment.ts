// Statement-vs-vote alignment engine — original site thesis. For each issue
// where a legislator has a sourced public stance, does their voting record
// on substantive bills tagged to that issue line up with that stance?
//
// Methodology v2 (this file): tagged-rollcall matching.
//   - Previous (v1) used keyword matching against Voteview vote_desc. That
//     produced false signals — procedural cloture motions hid bill substance
//     behind generic language, and the engine couldn't distinguish "voted
//     Nay on a motion to recommit a gun control bill" (procedural defense
//     of the bill) from "voted Nay on the bill itself" (substantive
//     opposition).
//   - v2 uses a hand-curated TAGGED_ROLLCALLS registry. Each entry pins a
//     bill number to an issue and explicitly declares which cast direction
//     advances the "favors" stance. The engine looks up the legislator's
//     cast on the substantive rollcalls referencing that bill.
//
// Reading flow:
//   - Untagged issues: surface "No tagged votes yet" rather than misleading
//     keyword data. Honest about coverage.
//   - Tagged issues with no votes from this legislator (they weren't seated
//     yet, or missed the vote): "No matching votes yet" — same display.
//   - Tagged issues with votes: count consistent vs inconsistent, derive
//     issue alignment (>=50% consistent), aggregate overall percentage.

import {
  ISSUES,
  ISSUES_BY_ID,
  type IssueId,
  type LegislatorStance,
  type StanceDirection,
  getStancesForBioguide,
} from "./positions";
import {
  rollcallsForIssue,
  type TaggedRollcall,
} from "./tagged-rollcalls";
import {
  getTaggedVotesForLegislator,
  type CastCode,
  type TaggedVoteResult,
} from "./votes";

export type IssueAlignment = {
  issueId: IssueId;
  issueTitle: string;
  stance: LegislatorStance;
  matchingVotes: Array<{
    congress: number;
    rollnumber: number;
    date: string;
    voteDesc: string;
    billNumber: string | null;
    cast: CastCode;
    favorsDirection: "yes" | "no";
    consistent: boolean;
    billDescription: string;
    billSourceUrl: string | null;
  }>;
  consistentCount: number;
  inconsistentCount: number;
  consideredCount: number;
  aligned: boolean | null;
};

export type StatementAlignment = {
  bioguide: string;
  method: "statement-vs-vote";
  perIssue: IssueAlignment[];
  issuesAligned: number;
  issuesInconsistent: number;
  issuesUnscored: number;
  overallPercentage: number | null;
};

function castSupportsBill(cast: CastCode): "yes" | "no" | "skip" {
  if (cast === "Yea") return "yes";
  if (cast === "Nay") return "no";
  return "skip";
}

function voteSupportsFavors(
  cast: CastCode,
  favorsDirection: "Yea" | "Nay"
): "yes" | "no" | "skip" {
  const supportsBill = castSupportsBill(cast);
  if (supportsBill === "skip") return "skip";
  // favorsDirection is the cast value that advances the issue's favors
  // stance. If they cast that direction, they support favors.
  if (favorsDirection === "Yea") {
    return supportsBill;
  }
  // favorsDirection === "Nay": casting Nay supports favors, casting Yea
  // opposes favors.
  return supportsBill === "yes" ? "no" : "yes";
}

function alignmentForIssue(
  issueId: IssueId,
  stance: LegislatorStance,
  taggedVotes: TaggedVoteResult[]
): IssueAlignment {
  const issue = ISSUES_BY_ID.get(issueId);
  const matching: IssueAlignment["matchingVotes"] = [];
  let consistent = 0;
  let inconsistent = 0;

  for (const v of taggedVotes) {
    const favors = voteSupportsFavors(v.cast, v.tag.favorsDirection);
    if (favors === "skip") continue;
    const consistentBool =
      favors === (stance.direction === "favors" ? "yes" : "no");
    matching.push({
      congress: v.congress,
      rollnumber: v.rollnumber,
      date: v.date,
      voteDesc: v.voteDesc,
      billNumber: v.billNumber,
      cast: v.cast,
      favorsDirection: favors,
      consistent: consistentBool,
      billDescription: v.tag.description,
      billSourceUrl: v.tag.sourceUrl ?? null,
    });
    if (consistentBool) consistent += 1;
    else inconsistent += 1;
  }

  const considered = consistent + inconsistent;
  const aligned: boolean | null =
    considered === 0 ? null : consistent >= inconsistent;

  return {
    issueId,
    issueTitle: issue?.title ?? issueId,
    stance,
    matchingVotes: matching,
    consistentCount: consistent,
    inconsistentCount: inconsistent,
    consideredCount: considered,
    aligned,
  };
}

export async function getStatementAlignmentByBioguide(opts: {
  bioguide: string;
  chamber: "Senate" | "House";
}): Promise<StatementAlignment | null> {
  const { bioguide, chamber } = opts;
  const stances = getStancesForBioguide(bioguide);
  const stanceEntries = Object.entries(stances) as Array<[IssueId, LegislatorStance]>;

  if (stanceEntries.length === 0) {
    return null;
  }

  // For each issue with a stance, gather tagged rollcalls that apply.
  // Limit to rollcalls in the legislator's own chamber (a senator's
  // alignment scoring uses Senate tagged votes; same for reps).
  const taggedByIssue = new Map<IssueId, TaggedRollcall[]>();
  for (const [issueId] of stanceEntries) {
    const tags = rollcallsForIssue(issueId).filter(
      (t) => t.chamber === chamber
    );
    taggedByIssue.set(issueId, tags);
  }

  // Flatten all tags into one list for a single batched lookup.
  const allTags = Array.from(taggedByIssue.values()).flat();
  const taggedVotes = await getTaggedVotesForLegislator({
    bioguide,
    tags: allTags,
  });

  // Group votes back by issue.
  const votesByIssue = new Map<IssueId, TaggedVoteResult[]>();
  for (const v of taggedVotes) {
    const bucket = votesByIssue.get(v.tag.issueId);
    if (bucket) bucket.push(v);
    else votesByIssue.set(v.tag.issueId, [v]);
  }

  const perIssue: IssueAlignment[] = stanceEntries.map(([issueId, stance]) =>
    alignmentForIssue(issueId, stance, votesByIssue.get(issueId) ?? [])
  );

  let issuesAligned = 0;
  let issuesInconsistent = 0;
  let issuesUnscored = 0;
  for (const ia of perIssue) {
    if (ia.aligned === null) issuesUnscored += 1;
    else if (ia.aligned) issuesAligned += 1;
    else issuesInconsistent += 1;
  }

  const scoreable = issuesAligned + issuesInconsistent;
  const overallPercentage =
    scoreable > 0 ? Math.round((issuesAligned / scoreable) * 100) : null;

  return {
    bioguide,
    method: "statement-vs-vote",
    perIssue,
    issuesAligned,
    issuesInconsistent,
    issuesUnscored,
    overallPercentage,
  };
}

// Re-export ISSUES so the UI can list "issues we score on" without importing
// from positions.ts directly.
export { ISSUES, type StanceDirection };
