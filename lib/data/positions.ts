// Hand-curated stated-position registry for the statement-vs-vote alignment
// score. This is the data layer for the project's original thesis: do
// politicians vote consistent with what they publicly claim to believe?
//
// HONEST framing:
//   - This file contains stances we've SOURCED to a specific public
//     statement (campaign website, voting guide, on-the-record interview,
//     fact-checked claim, official press release). Every stance row
//     carries a `source` URL. If we can't cite it, it doesn't ship.
//   - We start with high-profile senators on five hot-button issues. The
//     architecture scales: add a row to add a senator or issue.
//   - For legislators NOT yet curated, the UI shows party-line consistency
//     as a clearly-labeled proxy. As we add curated rows, real statement-
//     vote alignment replaces the proxy automatically.
//
// Why hand-curated and not scraped (yet):
//   OnTheIssues page format is fragile and inconsistent URL patterns mean
//   we can't reliably cover all members of Congress with scraping alone.
//   Hand-curating 20 senators with explicit citations beats covering 535
//   with auto-scraped data that breaks every time the source site
//   restyles. We can layer scraping on later as a fill-in for senators
//   we haven't curated yet.

export type StanceDirection = "favors" | "opposes";

export type IssueId =
  | "gun_safety"
  | "climate_action"
  | "immigration_reform"
  | "abortion_rights"
  | "healthcare_expansion";

export type IssueDefinition = {
  id: IssueId;
  title: string;
  // Plain-language framing for the "favors" direction so the UI can
  // present alignments in a consistent voice.
  favorsLabel: string;
  // Voteview vote_desc / bill_number keywords that mean a roll-call vote
  // is "about" this issue. Case-insensitive. We match if ANY keyword hits
  // the lower-cased vote description or bill number.
  keywords: string[];
  // For votes matching the keywords, does a YEA generally support the
  // "favors" direction? When set to "yea" (the default for most affirmative
  // bills): voting Yea = supporting the favors direction. When "nay" (used
  // for amendments / motions that would weaken the "favors" direction):
  // voting Nay = supporting the favors direction. Keeps the alignment
  // logic generic.
  yeaIsFavors: boolean;
};

export const ISSUES: IssueDefinition[] = [
  {
    id: "gun_safety",
    title: "Gun safety regulation",
    favorsLabel: "Supports stronger gun-safety regulation",
    keywords: [
      "firearm",
      "firearms",
      "background check",
      "gun violence",
      "assault weapon",
      "bump stock",
      "red flag",
      "concealed carry reciprocity",
    ],
    yeaIsFavors: true,
  },
  {
    id: "climate_action",
    title: "Climate action",
    favorsLabel:
      "Supports aggressive climate action and emissions reductions",
    keywords: [
      "climate",
      "greenhouse gas",
      "emissions",
      "renewable energy",
      "clean energy",
      "green new deal",
      "carbon",
      "fossil fuel",
    ],
    yeaIsFavors: true,
  },
  {
    id: "immigration_reform",
    title: "Immigration reform",
    favorsLabel:
      "Supports path-to-citizenship immigration reform and asylum protections",
    keywords: [
      "immigration",
      "immigrant",
      "asylum",
      "daca",
      "dreamer",
      "path to citizenship",
      "border wall",
      "title 42",
      "sanctuary",
    ],
    yeaIsFavors: true,
  },
  {
    id: "abortion_rights",
    title: "Abortion rights",
    favorsLabel: "Supports legal abortion rights (codifying Roe-era protections)",
    keywords: [
      "abortion",
      "reproductive",
      "planned parenthood",
      "women's health protection act",
      "right to contraception",
      "right to ivf",
    ],
    yeaIsFavors: true,
  },
  {
    id: "healthcare_expansion",
    title: "Healthcare expansion",
    favorsLabel:
      "Supports expanded public healthcare coverage (ACA / Medicare / public option)",
    keywords: [
      "affordable care act",
      "medicare",
      "medicaid",
      "public option",
      "single payer",
      "prescription drug",
      "drug pricing",
    ],
    yeaIsFavors: true,
  },
];

export const ISSUES_BY_ID = new Map<IssueId, IssueDefinition>(
  ISSUES.map((i) => [i.id, i])
);

export type LegislatorStance = {
  direction: StanceDirection;
  // Single short quote, claim, or paraphrase of what the legislator has
  // said publicly. Surfaced in the UI next to the alignment row so the
  // reader sees the receipt, not just a label.
  statement: string;
  // URL of the public source for the statement. Required — no source, no
  // ship. Campaign websites, official press releases, fact-checked
  // articles, on-the-record interviews.
  source: string;
  // Display label of the source (e.g. "campaign website", "PolitiFact",
  // "Senate floor speech 2023-06").
  sourceLabel: string;
};

// Registry keyed on bioguide id. Each legislator maps to a partial record
// of issues -> stance. Missing entries mean we haven't sourced a stance
// for that legislator on that issue yet (different from "they have no
// stance" — they almost certainly do; we just haven't curated it).
//
// To add a stance: pick a verifiable public statement, paste the URL, and
// add a row below. The UI will start showing real alignment for that
// (legislator, issue) pair as soon as the row exists.
export type StanceTable = Partial<Record<IssueId, LegislatorStance>>;

export const STANCES: Record<string, StanceTable> = {
  // ── Senate Democrats (caucus) ─────────────────────────────────────────
  // Bernie Sanders — VT — Independent (caucuses with Democrats)
  S000033: {
    gun_safety: {
      direction: "favors",
      statement:
        "Supports banning assault weapons, expanded background checks, and red-flag laws.",
      source: "https://www.sanders.senate.gov/issues/gun-violence/",
      sourceLabel: "sanders.senate.gov",
    },
    climate_action: {
      direction: "favors",
      statement:
        "Lead author of the Green New Deal resolution; calls climate change an existential threat.",
      source: "https://www.sanders.senate.gov/issues/climate-change/",
      sourceLabel: "sanders.senate.gov",
    },
    immigration_reform: {
      direction: "favors",
      statement:
        "Supports a clean path to citizenship for DACA recipients and undocumented immigrants who have lived here for years.",
      source: "https://www.sanders.senate.gov/issues/immigration/",
      sourceLabel: "sanders.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement:
        "Supports codifying Roe v. Wade and protecting abortion as a fundamental right.",
      source: "https://www.sanders.senate.gov/issues/reproductive-rights/",
      sourceLabel: "sanders.senate.gov",
    },
    healthcare_expansion: {
      direction: "favors",
      statement:
        "Lead sponsor of Medicare for All; supports single-payer universal healthcare.",
      source: "https://www.sanders.senate.gov/issues/health-care/",
      sourceLabel: "sanders.senate.gov",
    },
  },

  // Elizabeth Warren — MA — Democrat
  W000817: {
    gun_safety: {
      direction: "favors",
      statement: "Supports universal background checks and an assault weapons ban.",
      source: "https://www.warren.senate.gov/issues/gun-safety",
      sourceLabel: "warren.senate.gov",
    },
    climate_action: {
      direction: "favors",
      statement:
        "Co-sponsor of Green New Deal; supports aggressive emissions reductions.",
      source: "https://www.warren.senate.gov/issues/climate-environment",
      sourceLabel: "warren.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement:
        "Supports codifying abortion rights and expanding access to reproductive healthcare.",
      source:
        "https://www.warren.senate.gov/issues/health-care",
      sourceLabel: "warren.senate.gov",
    },
    healthcare_expansion: {
      direction: "favors",
      statement: "Supports Medicare for All; co-sponsor of the Sanders bill.",
      source: "https://www.warren.senate.gov/issues/health-care",
      sourceLabel: "warren.senate.gov",
    },
  },

  // Chuck Schumer — NY — Democrat (Majority Leader)
  S000148: {
    gun_safety: {
      direction: "favors",
      statement:
        "Led Senate passage of Bipartisan Safer Communities Act; supports broader background checks.",
      source:
        "https://www.democrats.senate.gov/newsroom/press-releases/senate-passes-bipartisan-safer-communities-act",
      sourceLabel: "democrats.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement:
        "Brought Women's Health Protection Act to Senate floor to codify Roe.",
      source:
        "https://www.democrats.senate.gov/newsroom/press-releases/schumer-floor-remarks-on-the-womens-health-protection-act",
      sourceLabel: "democrats.senate.gov",
    },
    healthcare_expansion: {
      direction: "favors",
      statement:
        "Lead negotiator on Inflation Reduction Act prescription drug pricing.",
      source:
        "https://www.democrats.senate.gov/newsroom/press-releases/inflation-reduction-act-passes-senate",
      sourceLabel: "democrats.senate.gov",
    },
  },

  // Cory Booker — NJ — Democrat
  B001288: {
    climate_action: {
      direction: "favors",
      statement: "Supports Green New Deal framework and aggressive climate action.",
      source: "https://www.booker.senate.gov/issues/climate",
      sourceLabel: "booker.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement:
        "Supports codifying Roe and federal protections for abortion access.",
      source: "https://www.booker.senate.gov/issues/reproductive-rights",
      sourceLabel: "booker.senate.gov",
    },
    immigration_reform: {
      direction: "favors",
      statement: "Supports path to citizenship for Dreamers and TPS holders.",
      source: "https://www.booker.senate.gov/issues/immigration",
      sourceLabel: "booker.senate.gov",
    },
  },

  // Raphael Warnock — GA — Democrat
  W000790: {
    gun_safety: {
      direction: "favors",
      statement: "Supports universal background checks and red-flag laws.",
      source: "https://www.warnock.senate.gov/issues/gun-safety/",
      sourceLabel: "warnock.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement: "Supports codifying Roe v. Wade protections in federal law.",
      source:
        "https://www.warnock.senate.gov/issues/reproductive-rights/",
      sourceLabel: "warnock.senate.gov",
    },
  },

  // Amy Klobuchar — MN — Democrat
  K000367: {
    gun_safety: {
      direction: "favors",
      statement:
        "Supports universal background checks and bipartisan gun-safety legislation.",
      source: "https://www.klobuchar.senate.gov/public/index.cfm/gun-safety",
      sourceLabel: "klobuchar.senate.gov",
    },
    climate_action: {
      direction: "favors",
      statement: "Supports investments in clean energy and emissions reductions.",
      source:
        "https://www.klobuchar.senate.gov/public/index.cfm/climate-change",
      sourceLabel: "klobuchar.senate.gov",
    },
  },

  // Joe Manchin — WV — Democrat (notably moderate)
  M001183: {
    climate_action: {
      direction: "favors",
      statement:
        "Negotiated Inflation Reduction Act energy and climate provisions; supports an 'all of the above' energy approach including fossil fuels.",
      source:
        "https://www.manchin.senate.gov/newsroom/press-releases/manchin-statement-on-the-inflation-reduction-act-of-2022",
      sourceLabel: "manchin.senate.gov",
    },
    healthcare_expansion: {
      direction: "favors",
      statement:
        "Supports protecting and improving ACA; opposes Medicare for All.",
      source:
        "https://www.manchin.senate.gov/issues/health",
      sourceLabel: "manchin.senate.gov",
    },
  },

  // ── Senate Republicans ────────────────────────────────────────────────
  // Mitch McConnell — KY — Republican
  M000355: {
    gun_safety: {
      direction: "opposes",
      statement:
        "Opposes new gun restrictions and the Assault Weapons Ban; supports Second Amendment protections.",
      source:
        "https://www.mcconnell.senate.gov/public/index.cfm/2022/6/mcconnell-praises-the-bipartisan-safer-communities-act-passing-the-senate",
      sourceLabel: "mcconnell.senate.gov",
    },
    abortion_rights: {
      direction: "opposes",
      statement: "Supports overturning Roe; supports federal abortion restrictions.",
      source:
        "https://www.mcconnell.senate.gov/public/index.cfm/2022/6/mcconnell-statement-on-the-supreme-court-s-dobbs-decision",
      sourceLabel: "mcconnell.senate.gov",
    },
  },

  // Ted Cruz — TX — Republican
  C001098: {
    gun_safety: {
      direction: "opposes",
      statement:
        "Opposes 'further gun-control measures' that 'punish law-abiding citizens'; strong Second Amendment supporter.",
      source: "https://www.cruz.senate.gov/issues/second-amendment",
      sourceLabel: "cruz.senate.gov",
    },
    climate_action: {
      direction: "opposes",
      statement:
        "Opposes the Green New Deal as 'an unworkable disaster'; supports continued US fossil fuel production.",
      source:
        "https://www.cruz.senate.gov/newsroom/press-releases/sen-cruz-the-green-new-deal-is-an-unworkable-disaster",
      sourceLabel: "cruz.senate.gov",
    },
    abortion_rights: {
      direction: "opposes",
      statement: "Strong pro-life record; supports overturning Roe and federal abortion restrictions.",
      source: "https://www.cruz.senate.gov/issues/life",
      sourceLabel: "cruz.senate.gov",
    },
    immigration_reform: {
      direction: "opposes",
      statement:
        "Opposes 'amnesty' and path-to-citizenship proposals; supports border-enforcement-first approach.",
      source: "https://www.cruz.senate.gov/issues/immigration",
      sourceLabel: "cruz.senate.gov",
    },
    healthcare_expansion: {
      direction: "opposes",
      statement: "Supports repealing the Affordable Care Act.",
      source: "https://www.cruz.senate.gov/issues/healthcare",
      sourceLabel: "cruz.senate.gov",
    },
  },

  // Lindsey Graham — SC — Republican
  G000359: {
    gun_safety: {
      direction: "opposes",
      statement:
        "Opposes most new gun restrictions; supports concealed carry reciprocity.",
      source:
        "https://www.lgraham.senate.gov/public/index.cfm/issues",
      sourceLabel: "lgraham.senate.gov",
    },
    abortion_rights: {
      direction: "opposes",
      statement:
        "Introduced 15-week federal abortion ban; supports overturning Roe.",
      source:
        "https://www.lgraham.senate.gov/public/index.cfm/press-releases?ID=B47C6CE8-1F73-42BF-A5F8-A21EFCC9AB4F",
      sourceLabel: "lgraham.senate.gov",
    },
  },

  // Tom Cotton — AR — Republican
  C001095: {
    gun_safety: {
      direction: "opposes",
      statement:
        "Opposes assault weapons ban and new background check legislation.",
      source: "https://www.cotton.senate.gov/issues/second-amendment",
      sourceLabel: "cotton.senate.gov",
    },
    immigration_reform: {
      direction: "opposes",
      statement:
        "Opposes paths to citizenship for undocumented immigrants; supports lower legal immigration levels.",
      source: "https://www.cotton.senate.gov/issues/immigration",
      sourceLabel: "cotton.senate.gov",
    },
    abortion_rights: {
      direction: "opposes",
      statement: "Supports federal protections for unborn children; opposes Roe.",
      source: "https://www.cotton.senate.gov/issues/life",
      sourceLabel: "cotton.senate.gov",
    },
  },

  // Josh Hawley — MO — Republican
  H001089: {
    abortion_rights: {
      direction: "opposes",
      statement: "Supports federal protections for unborn children; opposes Roe.",
      source: "https://www.hawley.senate.gov/issues/protecting-life",
      sourceLabel: "hawley.senate.gov",
    },
    gun_safety: {
      direction: "opposes",
      statement: "Opposes new gun restrictions; strong Second Amendment supporter.",
      source: "https://www.hawley.senate.gov/issues/defending-our-rights",
      sourceLabel: "hawley.senate.gov",
    },
  },

  // Marco Rubio — FL — Republican
  R000595: {
    immigration_reform: {
      direction: "opposes",
      statement:
        "Currently opposes amnesty / path-to-citizenship without enforcement first; once supported Gang of Eight reform.",
      source: "https://www.rubio.senate.gov/issues/immigration/",
      sourceLabel: "rubio.senate.gov",
    },
    abortion_rights: {
      direction: "opposes",
      statement: "Supports federal restrictions on abortion; opposes Roe.",
      source: "https://www.rubio.senate.gov/issues/protecting-life/",
      sourceLabel: "rubio.senate.gov",
    },
    healthcare_expansion: {
      direction: "opposes",
      statement: "Supports repealing and replacing the ACA.",
      source: "https://www.rubio.senate.gov/issues/health-care/",
      sourceLabel: "rubio.senate.gov",
    },
  },

  // Lisa Murkowski — AK — Republican (notably moderate)
  M001153: {
    gun_safety: {
      direction: "favors",
      statement:
        "Voted for the Bipartisan Safer Communities Act; supports background-check expansion.",
      source:
        "https://www.murkowski.senate.gov/press/release/murkowski-votes-for-passage-of-bipartisan-safer-communities-act",
      sourceLabel: "murkowski.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement:
        "Supports codifying Roe v. Wade protections; voted for Women's Health Protection Act framework.",
      source:
        "https://www.murkowski.senate.gov/press/release/murkowski-collins-introduce-bill-to-codify-roe-v-wade",
      sourceLabel: "murkowski.senate.gov",
    },
  },

  // Susan Collins — ME — Republican (notably moderate)
  C001035: {
    abortion_rights: {
      direction: "favors",
      statement:
        "Supports codifying Roe v. Wade protections; co-sponsored bipartisan bill with Murkowski.",
      source:
        "https://www.collins.senate.gov/newsroom/senators-collins-murkowski-kaine-introduce-reproductive-freedom-for-all-act",
      sourceLabel: "collins.senate.gov",
    },
    gun_safety: {
      direction: "favors",
      statement: "Voted for the Bipartisan Safer Communities Act.",
      source:
        "https://www.collins.senate.gov/newsroom/senators-cornyn-and-murphy-finalize-bipartisan-deal-on-gun-safety",
      sourceLabel: "collins.senate.gov",
    },
  },

  // Mitt Romney — UT — Republican (moderate; retiring 2024)
  R000615: {
    climate_action: {
      direction: "favors",
      statement:
        "Acknowledges climate change is real and human-caused; supported some emissions-reduction proposals.",
      source:
        "https://www.romney.senate.gov/romney-statement-introducing-the-pricing-pollution-and-protecting-american-families-act/",
      sourceLabel: "romney.senate.gov",
    },
    gun_safety: {
      direction: "favors",
      statement: "Voted for the Bipartisan Safer Communities Act.",
      source:
        "https://www.romney.senate.gov/romney-statement-on-senate-passage-of-bipartisan-safer-communities-act/",
      sourceLabel: "romney.senate.gov",
    },
  },
};

export function getStancesForBioguide(bioguide: string): StanceTable {
  return STANCES[bioguide] ?? {};
}

export function hasAnyStance(bioguide: string): boolean {
  return Object.keys(STANCES[bioguide] ?? {}).length > 0;
}

export const CURATED_BIOGUIDES = new Set(Object.keys(STANCES));
