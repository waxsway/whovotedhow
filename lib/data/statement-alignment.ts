// Statement-vs-vote alignment engine. This is the project's original thesis:
// for each issue where we have a sourced public statement from a legislator,
// did their actual voting record line up with that statement?
//
// Methodology, exposed in the API response and the UI:
//   1. For each issue the legislator has a curated stance on, scan all
//      their recent roll-call votes for descriptions matching the issue's
//      keyword list.
//   2. For each matching vote, derive a "supports the favors direction"
//      reading from the cast + the issue's yeaIsFavors convention.
//   3. Compare to the stated direction. If they match, the vote is
//      "consistent"; if they don't, "inconsistent".
//   4. An issue is "aligned" if >=50% of matching votes are consistent.
//   5. Overall alignment = (issues aligned / issues with both stance and
//      matching votes), rounded.
//
// What this is NOT:
//   - Not a fact-check engine (we don't independently rate statements as
//     true or false — we use the public-record stance as-is, with its URL
//     so the reader can verify).
//   - Not a one-vote gotcha: we look at the pattern across all matching
//     votes, not a single floor moment.
//   - Not exhaustive: we only score issues with curated stances. Missing
//     stance = no opinion on the score from us, by design.

import {
  ISSUES,
  ISSUES_BY_ID,
  type IssueId,
  type LegislatorStance,
  type StanceDirection,
  getStancesForBioguide,
} from "./positions";
import {
  getRecentVotesByBioguide,
  type LegislatorVote,
  type CastCode,
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
    favorsDirection: "yes" | "no"; // did this vote support the favors direction?
    consistent: boolean; // matches the stated direction?
  }>;
  consistentCount: number;
  inconsistentCount: number;
  consideredCount: number;
  // null when consideredCount is 0 (no matching votes — can't score)
  aligned: boolean | null;
};

export type StatementAlignment = {
  bioguide: string;
  method: "statement-vs-vote";
  // Per-issue breakdown, only including issues the legislator has a
  // curated stance on.
  perIssue: IssueAlignment[];
  // Overall summary: how many of the stance issues line up with voting.
  issuesAligned: number;
  issuesInconsistent: number;
  issuesUnscored: number; // stance present, no matching votes
  overallPercentage: number | null; // 0..100, null if nothing scoreable
};

function castSupportsBill(cast: CastCode): "yes" | "no" | "skip" {
  if (cast === "Yea") return "yes";
  if (cast === "Nay") return "no";
  return "skip"; // Present / Not Voting / Other
}

function voteSupportsFavors(
  cast: CastCode,
  yeaIsFavors: boolean
): "yes" | "no" | "skip" {
  const supportsBill = castSupportsBill(cast);
  if (supportsBill === "skip") return "skip";
  if (yeaIsFavors) return supportsBill;
  // Yea-is-against-favors case: invert
  return supportsBill === "yes" ? "no" : "yes";
}

function voteMatchesIssue(vote: LegislatorVote, keywords: string[]): boolean {
  const haystack = `${vote.voteDesc} ${vote.voteQuestion} ${vote.billNumber ?? ""}`.toLowerCase();
  for (const kw of keywords) {
    if (haystack.includes(kw.toLowerCase())) return true;
  }
  return false;
}

function alignmentForIssue(
  issueId: IssueId,
  stance: LegislatorStance,
  votes: LegislatorVote[]
): IssueAlignment {
  const issue = ISSUES_BY_ID.get(issueId);
  if (!issue) {
    return {
      issueId,
      issueTitle: issueId,
      stance,
      matchingVotes: [],
      consistentCount: 0,
      inconsistentCount: 0,
      consideredCount: 0,
      aligned: null,
    };
  }

  const matching: IssueAlignment["matchingVotes"] = [];
  let consistent = 0;
  let inconsistent = 0;

  for (const v of votes) {
    if (!voteMatchesIssue(v, issue.keywords)) continue;
    const favors = voteSupportsFavors(v.cast, issue.yeaIsFavors);
    if (favors === "skip") continue;
    const consistentBool = favors === (stance.direction === "favors" ? "yes" : "no");
    matching.push({
      congress: v.congress,
      rollnumber: v.rollnumber,
      date: v.date,
      voteDesc: v.voteDesc,
      billNumber: v.billNumber,
      cast: v.cast,
      favorsDirection: favors,
      consistent: consistentBool,
    });
    if (consistentBool) consistent += 1;
    else inconsistent += 1;
  }

  const considered = consistent + inconsistent;
  const aligned: boolean | null =
    considered === 0 ? null : consistent >= inconsistent;

  return {
    issueId,
    issueTitle: issue.title,
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
    // No curated stances yet → no statement-vs-vote score available.
    // Caller can fall back to party-line proxy.
    return null;
  }

  // Pull more votes than the displayed 15 so we catch issue-relevant ones
  // even if they're not in the very most recent slice.
  const votes = await getRecentVotesByBioguide(bioguide, {
    chamber,
    limit: 200,
  });

  const perIssue: IssueAlignment[] = stanceEntries.map(([issueId, stance]) =>
    alignmentForIssue(issueId, stance, votes)
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
