// Constituent-vote alignment. For each legislator, how often do they vote
// in the direction their state's electorate actually leans?
//
// Methodology:
//   1. Look up the state's Cook PVI (Democratic or Republican lean).
//   2. Pull the legislator's recent roll-call alignment with their party.
//   3. Derive "in step with state's lean" by combining their party with
//      the state's lean:
//        - Legislator's party MATCHES state's lean direction:
//            CVA = party-line consistency (voting with their party IS
//            voting with their state's lean)
//        - Legislator's party OPPOSES state's lean direction:
//            CVA = 100 - party-line consistency (voting with their party
//            is voting AGAINST their state's lean; voting against their
//            party is voting WITH their state's lean — so the "in step"
//            score inverts)
//        - State is too close to call (|PVI| < 3): no CVA computed; UI
//          surfaces both stats side-by-side without a single derived
//          score.
//
// Why this metric matters: it surfaces representation-vs-vote tension
// distinct from statement-vs-vote. A senator from a deep-red state who
// votes party-line Democrat is "out of step" with their constituents
// regardless of whether they kept their campaign promises. Both lenses
// are useful; neither replaces the other.

import { pviForState, leanDirection, type StatePvi } from "./partisan-lean";
import { getPartyAlignmentByBioguide } from "./votes";

export type ConstituentAlignment = {
  bioguide: string;
  stateCode: string;
  // Cook PVI snapshot for the state, surfaced so the UI doesn't have to
  // re-import the registry. Null when state not on file (very rare).
  pvi: StatePvi | null;
  // The party the legislator is scored against (their own or their
  // caucus party — Independents caucusing with Democrats get D).
  legislatorParty: "D" | "R" | "I";
  // The direction the state's electorate leans.
  stateLean: "D" | "R" | "EVEN";
  // Party-line consistency percentage (0..100). Pulled through from the
  // existing party-alignment engine.
  partyLineConsistency: number;
  // The derived "in step with state's partisan lean" percentage. Null
  // when state lean is too close to call (|PVI| < 3) or the underlying
  // party-line consistency couldn't be computed.
  constituentAlignment: number | null;
  // Plain-language description of what the score means in context.
  // Used by the UI for the small explanation under the score.
  rationale: string;
};

export async function getConstituentAlignmentByBioguide(opts: {
  bioguide: string;
  party: "D" | "R" | "I";
  chamber: "Senate" | "House";
  stateCode: string;
}): Promise<ConstituentAlignment> {
  const { bioguide, party, chamber, stateCode } = opts;
  const pvi = pviForState(stateCode);

  if (!pvi) {
    return {
      bioguide,
      stateCode,
      pvi: null,
      legislatorParty: party,
      stateLean: "EVEN",
      partyLineConsistency: 0,
      constituentAlignment: null,
      rationale: `Cook PVI not on file for ${stateCode}.`,
    };
  }

  const partyAlignment = await getPartyAlignmentByBioguide({
    bioguide,
    party,
    chamber,
  });

  const stateLean = leanDirection(pvi.pvi);
  const partyLineConsistency = partyAlignment.percentage;

  if (partyAlignment.votesConsidered === 0) {
    return {
      bioguide,
      stateCode,
      pvi,
      legislatorParty: party,
      stateLean,
      partyLineConsistency: 0,
      constituentAlignment: null,
      rationale: "Not enough recent votes to compute alignment yet.",
    };
  }

  if (stateLean === "EVEN") {
    return {
      bioguide,
      stateCode,
      pvi,
      legislatorParty: party,
      stateLean,
      partyLineConsistency,
      constituentAlignment: null,
      rationale: `${stateCode} is a swing state (${pvi.label}); single-number constituent alignment is misleading here. Their party-line voting is shown for context.`,
    };
  }

  // Independents are scored against their caucus party. Sanders, Angus
  // King, and most other Senate Independents caucus with Democrats. We
  // treat I = D for the lean comparison.
  const effectiveParty: "D" | "R" = party === "R" ? "R" : "D";
  const partyMatchesLean = effectiveParty === stateLean;

  const cva = partyMatchesLean
    ? partyLineConsistency
    : 100 - partyLineConsistency;

  const partyWord = effectiveParty === "D" ? "Democratic" : "Republican";
  const leanWord = stateLean === "D" ? "Democratic" : "Republican";
  const rationale = partyMatchesLean
    ? `${stateCode} leans ${pvi.label} and this legislator caucuses with ${partyWord}s — voting with their party IS voting with the state's lean. Score reflects party-line consistency.`
    : `${stateCode} leans ${pvi.label} but this legislator caucuses with ${partyWord}s. "In step with constituents" inverts: when they break with their party (voting with ${leanWord}s), they're voting in the direction their state's electorate would.`;

  return {
    bioguide,
    stateCode,
    pvi,
    legislatorParty: party,
    stateLean,
    partyLineConsistency,
    constituentAlignment: cva,
    rationale,
  };
}
