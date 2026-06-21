// Cook PVI (Partisan Voter Index) per state. The single best public
// measure of how much a state leans Democratic or Republican relative to
// the national average. Used to compute "constituent-vote alignment" —
// how often a legislator votes in the direction their state's electorate
// actually leans.
//
// Scale: positive values = Democratic-leaning, negative = Republican-
// leaning. "VT D+15" means Vermont voted 15 points more Democratic than
// the country average across the most recent two presidential cycles.
//
// Source: Cook Political Report with Amy Walter, Cook PVI 2025 edition,
// computed from 2020 and 2024 presidential results. Publication URL:
// https://www.cookpolitical.com/cook-pvi
//
// IMPORTANT: these values are encoded from memory of the public Cook PVI
// 2025 table. Spot-check + correct any rows that look off against the
// canonical source. Architecture stands either way — adjusting an
// individual row is one edit; nothing else needs to move.

export type StatePvi = {
  // 2-letter USPS code matching legislators.state
  code: string;
  // Cook PVI numeric value: positive = leans Democratic, negative =
  // leans Republican. Magnitude in percentage points.
  pvi: number;
  // Plain-language label for UI ("D+15", "R+22", "EVEN")
  label: string;
};

// Cook PVI 2025 edition (post-2024 election).
// VERIFY VS https://www.cookpolitical.com/cook-pvi BEFORE PUBLICLY CITING.
export const STATE_PVI: StatePvi[] = [
  // Heavily Democratic-leaning
  { code: "VT", pvi: 16, label: "D+16" },
  { code: "MA", pvi: 15, label: "D+15" },
  { code: "HI", pvi: 14, label: "D+14" },
  { code: "MD", pvi: 14, label: "D+14" },
  { code: "CA", pvi: 13, label: "D+13" },
  { code: "NY", pvi: 10, label: "D+10" },
  { code: "WA", pvi: 8, label: "D+8" },
  { code: "DE", pvi: 7, label: "D+7" },
  { code: "CT", pvi: 7, label: "D+7" },
  { code: "IL", pvi: 7, label: "D+7" },
  { code: "RI", pvi: 7, label: "D+7" },
  { code: "NJ", pvi: 6, label: "D+6" },
  { code: "OR", pvi: 6, label: "D+6" },
  { code: "CO", pvi: 4, label: "D+4" },
  { code: "VA", pvi: 3, label: "D+3" },
  { code: "NM", pvi: 3, label: "D+3" },
  { code: "ME", pvi: 2, label: "D+2" },
  { code: "MN", pvi: 1, label: "D+1" },

  // Swing-ish (|PVI| <= 3)
  { code: "NH", pvi: 0, label: "EVEN" },
  { code: "MI", pvi: -1, label: "R+1" },
  { code: "NV", pvi: -1, label: "R+1" },
  { code: "PA", pvi: -2, label: "R+2" },
  { code: "WI", pvi: -2, label: "R+2" },
  { code: "AZ", pvi: -2, label: "R+2" },
  { code: "GA", pvi: -3, label: "R+3" },
  { code: "NC", pvi: -3, label: "R+3" },
  { code: "FL", pvi: -3, label: "R+3" },

  // Republican-leaning
  { code: "TX", pvi: -5, label: "R+5" },
  { code: "OH", pvi: -6, label: "R+6" },
  { code: "IA", pvi: -6, label: "R+6" },
  { code: "AK", pvi: -8, label: "R+8" },
  { code: "SC", pvi: -8, label: "R+8" },
  { code: "MO", pvi: -10, label: "R+10" },
  { code: "KS", pvi: -10, label: "R+10" },
  { code: "MS", pvi: -11, label: "R+11" },
  { code: "IN", pvi: -11, label: "R+11" },
  { code: "MT", pvi: -11, label: "R+11" },
  { code: "LA", pvi: -12, label: "R+12" },
  { code: "NE", pvi: -13, label: "R+13" },
  { code: "TN", pvi: -13, label: "R+13" },
  { code: "UT", pvi: -13, label: "R+13" },
  { code: "AL", pvi: -15, label: "R+15" },
  { code: "AR", pvi: -15, label: "R+15" },
  { code: "KY", pvi: -15, label: "R+15" },
  { code: "SD", pvi: -16, label: "R+16" },
  { code: "ID", pvi: -18, label: "R+18" },
  { code: "OK", pvi: -19, label: "R+19" },
  { code: "ND", pvi: -20, label: "R+20" },
  { code: "WV", pvi: -22, label: "R+22" },
  { code: "WY", pvi: -25, label: "R+25" },

  // Federal district (not a state, not represented in Congress for voting
  // purposes but rendered for completeness)
  { code: "DC", pvi: 43, label: "D+43" },
];

const BY_CODE = new Map<string, StatePvi>(STATE_PVI.map((s) => [s.code, s]));

export function pviForState(code: string): StatePvi | null {
  return BY_CODE.get(code.toUpperCase()) ?? null;
}

// Direction the state leans, normalized as the party code the legislator
// would be "in step with" by voting with that party's positions.
export type LeanDirection = "D" | "R" | "EVEN";

export function leanDirection(pvi: number): LeanDirection {
  if (pvi >= 3) return "D";
  if (pvi <= -3) return "R";
  return "EVEN";
}

export function leanDirectionForState(code: string): LeanDirection | null {
  const s = pviForState(code);
  if (!s) return null;
  return leanDirection(s.pvi);
}
