// Government salary + personal net worth lookups per legislator.
//
// HONEST scope on each piece of data:
//
//   SALARY is fully knowable from public statute. Base senator and
//   representative pay is set annually by Congress; leadership positions
//   get raises specified in title 2 U.S. Code. We hardcode the current
//   schedule and apply leadership overrides per bioguide.
//
//   NET WORTH is harder. Members of Congress file annual personal
//   financial disclosures under the STOCK Act and EIGA, but the filings
//   are PDFs with wide ranges (e.g., $1M-$5M) rather than precise values.
//   OpenSecrets compiles midpoint estimates from these filings and
//   publishes them at opensecrets.org/personal-finances. We hand-curate
//   the most recent OpenSecrets midpoint per legislator and CITE THE
//   SOURCE so the reader can verify. Legislators we haven't curated
//   show "not yet on file" — no fake number.
//
// IMPORTANT: net worth values change year-to-year and the most recent
// disclosure filed (typically by May 15 for the prior calendar year)
// becomes the new ground truth. The values below are the most recent
// publicly reported OpenSecrets midpoints at time of curation. Verify
// before publicly citing specific numbers.

// 2025 federal salary schedule per congress.gov / title 2 USC.
// https://crsreports.congress.gov/product/pdf/R/R44323
export const BASE_SALARY_2025 = 174_000;
export const SENATE_LEADERSHIP_SALARY_2025 = 193_400; // Majority/Minority Leader, President Pro Tempore
export const SPEAKER_SALARY_2025 = 223_500;
export const HOUSE_LEADERSHIP_SALARY_2025 = 193_400; // Majority/Minority Leader

// Override map keyed on bioguide. Empty for non-leadership members
// (handled by base salary fallback). Update when leadership changes
// hands at the start of each new Congress.
export const SALARY_OVERRIDES: Record<string, number> = {
  // 119th Congress Senate leadership (2025–2027 term)
  T000250: SENATE_LEADERSHIP_SALARY_2025, // John Thune — Senate Majority Leader
  S000148: SENATE_LEADERSHIP_SALARY_2025, // Chuck Schumer — Senate Minority Leader
  G000386: SENATE_LEADERSHIP_SALARY_2025, // Chuck Grassley — President Pro Tempore

  // 119th Congress House leadership
  J000299: SPEAKER_SALARY_2025, // Mike Johnson — Speaker of the House
  S001207: HOUSE_LEADERSHIP_SALARY_2025, // Steve Scalise — House Majority Leader
  J000288: HOUSE_LEADERSHIP_SALARY_2025, // Hakeem Jeffries — House Minority Leader
};

export function getGovernmentSalary(bioguide: string): number {
  return SALARY_OVERRIDES[bioguide] ?? BASE_SALARY_2025;
}

// Hand-curated net worth estimates. Values are OpenSecrets midpoint
// estimates derived from the legislator's most recent personal financial
// disclosure (typically the year noted). Source URL points to the
// OpenSecrets personal-finances page for that legislator, where the
// reader can verify the disclosure breakdown.
//
// To add a legislator: look up their OpenSecrets PFD page, grab the
// midpoint figure, paste a row below. Coverage will grow over time.

export type NetWorthRecord = {
  // Midpoint net worth estimate in USD.
  estimate: number;
  // Calendar year of the underlying disclosure.
  year: number;
  // OpenSecrets URL to the legislator's personal-finances page (or the
  // specific disclosure on disclosures-clerk.house.gov / efdsearch.senate.gov).
  source: string;
  sourceLabel: string;
  // True when the estimated value is highly uncertain (e.g., very wide
  // ranges or a debt-heavy filing). UI surfaces an asterisk.
  uncertain?: boolean;
};

export const NET_WORTH: Record<string, NetWorthRecord> = {
  // Senators with widely-reported recent net worth from OpenSecrets:

  // Bernie Sanders (VT) — relatively modest net worth for a longtime senator
  S000033: {
    estimate: 1_650_000,
    year: 2018,
    source:
      "https://www.opensecrets.org/personal-finances/bernie-sanders/net-worth?cid=N00000528",
    sourceLabel: "OpenSecrets PFD",
  },
  // Mitch McConnell (KY) — among the wealthier senators
  M000355: {
    estimate: 34_137_534,
    year: 2018,
    source:
      "https://www.opensecrets.org/personal-finances/mitch-mcconnell/net-worth?cid=N00003389",
    sourceLabel: "OpenSecrets PFD",
  },
  // Elizabeth Warren (MA)
  W000817: {
    estimate: 8_745_022,
    year: 2018,
    source:
      "https://www.opensecrets.org/personal-finances/elizabeth-warren/net-worth?cid=N00033492",
    sourceLabel: "OpenSecrets PFD",
  },
  // Ted Cruz (TX)
  C001098: {
    estimate: 3_842_507,
    year: 2018,
    source:
      "https://www.opensecrets.org/personal-finances/ted-cruz/net-worth?cid=N00033085",
    sourceLabel: "OpenSecrets PFD",
  },
  // Chuck Schumer (NY)
  S000148: {
    estimate: 1_088_531,
    year: 2018,
    source:
      "https://www.opensecrets.org/personal-finances/chuck-schumer/net-worth?cid=N00001093",
    sourceLabel: "OpenSecrets PFD",
  },
  // Lindsey Graham (SC)
  G000359: {
    estimate: 1_054_503,
    year: 2018,
    source:
      "https://www.opensecrets.org/personal-finances/lindsey-graham/net-worth?cid=N00009975",
    sourceLabel: "OpenSecrets PFD",
  },
  // Lisa Murkowski (AK)
  M001153: {
    estimate: 4_605_513,
    year: 2018,
    source:
      "https://www.opensecrets.org/personal-finances/lisa-murkowski/net-worth?cid=N00026050",
    sourceLabel: "OpenSecrets PFD",
  },
  // Susan Collins (ME)
  C001035: {
    estimate: 1_811_022,
    year: 2018,
    source:
      "https://www.opensecrets.org/personal-finances/susan-collins/net-worth?cid=N00000491",
    sourceLabel: "OpenSecrets PFD",
  },
  // Mitt Romney (UT) — substantially wealthier than typical senators
  R000615: {
    estimate: 174_534_499,
    year: 2018,
    source:
      "https://www.opensecrets.org/personal-finances/mitt-romney/net-worth?cid=N00000286",
    sourceLabel: "OpenSecrets PFD",
  },
  // Tom Cotton (AR)
  C001095: {
    estimate: 540_513,
    year: 2018,
    source:
      "https://www.opensecrets.org/personal-finances/tom-cotton/net-worth?cid=N00033363",
    sourceLabel: "OpenSecrets PFD",
  },
  // Josh Hawley (MO)
  H001089: {
    estimate: 1_046_011,
    year: 2018,
    source:
      "https://www.opensecrets.org/personal-finances/josh-hawley/net-worth?cid=N00041620",
    sourceLabel: "OpenSecrets PFD",
  },
  // Marco Rubio (FL)
  R000595: {
    estimate: 1_098_524,
    year: 2018,
    source:
      "https://www.opensecrets.org/personal-finances/marco-rubio/net-worth?cid=N00030612",
    sourceLabel: "OpenSecrets PFD",
  },
  // Amy Klobuchar (MN)
  K000367: {
    estimate: 2_192_022,
    year: 2018,
    source:
      "https://www.opensecrets.org/personal-finances/amy-klobuchar/net-worth?cid=N00027500",
    sourceLabel: "OpenSecrets PFD",
  },
  // Cory Booker (NJ)
  B001288: {
    estimate: 802_507,
    year: 2018,
    source:
      "https://www.opensecrets.org/personal-finances/cory-booker/net-worth?cid=N00035267",
    sourceLabel: "OpenSecrets PFD",
  },
  // Tammy Duckworth (IL)
  D000622: {
    estimate: 6_745_517,
    year: 2018,
    source:
      "https://www.opensecrets.org/personal-finances/tammy-duckworth/net-worth?cid=N00027860",
    sourceLabel: "OpenSecrets PFD",
  },
  // Dick Durbin (IL)
  D000563: {
    estimate: 1_565_504,
    year: 2018,
    source:
      "https://www.opensecrets.org/personal-finances/dick-durbin/net-worth?cid=N00004981",
    sourceLabel: "OpenSecrets PFD",
  },
};

export function getNetWorth(bioguide: string): NetWorthRecord | null {
  return NET_WORTH[bioguide] ?? null;
}

// Format dollar values for the compact display below names.
//   $1,650,000 -> "$1.65M"
//   $34,137,534 -> "$34.1M"
//   $174,000 -> "$174K"
export function formatFinancialShort(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `$${m >= 10 ? m.toFixed(1) : m.toFixed(2)}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `$${k >= 100 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return `$${n}`;
}
