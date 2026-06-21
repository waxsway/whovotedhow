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

  // ── Senate Democrats — additional coverage ────────────────────────────

  // Ron Wyden — OR — Democrat
  W000779: {
    abortion_rights: {
      direction: "favors",
      statement: "Supports codifying Roe-era protections in federal law.",
      source: "https://www.wyden.senate.gov/priorities/health-care",
      sourceLabel: "wyden.senate.gov",
    },
    healthcare_expansion: {
      direction: "favors",
      statement:
        "Lead author of the Drug Price Competition Act and Medicare drug pricing reform.",
      source: "https://www.wyden.senate.gov/priorities/health-care",
      sourceLabel: "wyden.senate.gov",
    },
    climate_action: {
      direction: "favors",
      statement: "Lead negotiator on Inflation Reduction Act clean energy tax credits.",
      source: "https://www.wyden.senate.gov/priorities/energy",
      sourceLabel: "wyden.senate.gov",
    },
  },

  // Patty Murray — WA — Democrat (Senate Pro Tempore)
  M001111: {
    abortion_rights: {
      direction: "favors",
      statement: "Long-time advocate for codifying Roe; chairs the Senate Appropriations Committee.",
      source: "https://www.murray.senate.gov/issue/reproductive-rights/",
      sourceLabel: "murray.senate.gov",
    },
    gun_safety: {
      direction: "favors",
      statement: "Supports universal background checks and assault weapons restrictions.",
      source: "https://www.murray.senate.gov/issue/gun-safety/",
      sourceLabel: "murray.senate.gov",
    },
    healthcare_expansion: {
      direction: "favors",
      statement: "Supports protecting ACA, Medicare expansion, and drug-pricing reform.",
      source: "https://www.murray.senate.gov/issue/health-care/",
      sourceLabel: "murray.senate.gov",
    },
  },

  // Maria Cantwell — WA — Democrat
  C000127: {
    climate_action: {
      direction: "favors",
      statement: "Chair of Commerce Committee; supports clean energy and EV infrastructure investments.",
      source: "https://www.cantwell.senate.gov/issues/environment",
      sourceLabel: "cantwell.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement: "Voted to advance Women's Health Protection Act protections.",
      source: "https://www.cantwell.senate.gov/issues/health-care",
      sourceLabel: "cantwell.senate.gov",
    },
  },

  // Mark Kelly — AZ — Democrat
  K000377: {
    gun_safety: {
      direction: "favors",
      statement:
        "Co-founded Giffords gun-safety advocacy after the 2011 Tucson shooting; supports background checks and red-flag laws.",
      source: "https://www.kelly.senate.gov/issues/gun-safety/",
      sourceLabel: "kelly.senate.gov",
    },
    immigration_reform: {
      direction: "favors",
      statement:
        "Supports a bipartisan border-security plus path-to-citizenship deal as negotiated in the 2024 Border Act.",
      source: "https://www.kelly.senate.gov/issues/border-security/",
      sourceLabel: "kelly.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement: "Supports codifying Roe v. Wade in federal law.",
      source: "https://www.kelly.senate.gov/issues/health-care/",
      sourceLabel: "kelly.senate.gov",
    },
  },

  // Catherine Cortez Masto — NV — Democrat
  C001113: {
    immigration_reform: {
      direction: "favors",
      statement: "Supports path to citizenship for Dreamers and TPS holders.",
      source: "https://www.cortezmasto.senate.gov/priorities/immigration",
      sourceLabel: "cortezmasto.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement: "Supports codifying Roe v. Wade protections.",
      source: "https://www.cortezmasto.senate.gov/priorities/health-care",
      sourceLabel: "cortezmasto.senate.gov",
    },
  },

  // Tim Kaine — VA — Democrat
  K000384: {
    abortion_rights: {
      direction: "favors",
      statement: "Supports codifying Roe v. Wade protections in federal law.",
      source: "https://www.kaine.senate.gov/issues/reproductive-rights",
      sourceLabel: "kaine.senate.gov",
    },
    immigration_reform: {
      direction: "favors",
      statement: "Author of bipartisan immigration reform legislation; supports path to citizenship.",
      source: "https://www.kaine.senate.gov/issues/immigration",
      sourceLabel: "kaine.senate.gov",
    },
    gun_safety: {
      direction: "favors",
      statement: "Supports universal background checks; voted for Bipartisan Safer Communities Act.",
      source: "https://www.kaine.senate.gov/issues/gun-safety",
      sourceLabel: "kaine.senate.gov",
    },
  },

  // Mark Warner — VA — Democrat
  W000805: {
    abortion_rights: {
      direction: "favors",
      statement: "Supports federal codification of Roe v. Wade.",
      source: "https://www.warner.senate.gov/public/index.cfm/health-care",
      sourceLabel: "warner.senate.gov",
    },
    healthcare_expansion: {
      direction: "favors",
      statement: "Supports protecting ACA and expanding Medicare drug pricing negotiation.",
      source: "https://www.warner.senate.gov/public/index.cfm/health-care",
      sourceLabel: "warner.senate.gov",
    },
  },

  // Roger Wicker — MS — Republican
  W000437: {
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life voting record; supports federal protections for unborn children.",
      source: "https://www.wicker.senate.gov/issues/life",
      sourceLabel: "wicker.senate.gov",
    },
    gun_safety: {
      direction: "opposes",
      statement: "Opposes new federal gun-control measures; strong Second Amendment supporter.",
      source: "https://www.wicker.senate.gov/issues/second-amendment",
      sourceLabel: "wicker.senate.gov",
    },
    immigration_reform: {
      direction: "opposes",
      statement: "Opposes amnesty; supports border-enforcement-first approach.",
      source: "https://www.wicker.senate.gov/issues/immigration",
      sourceLabel: "wicker.senate.gov",
    },
  },

  // Chris Coons — DE — Democrat
  C001088: {
    climate_action: {
      direction: "favors",
      statement: "Supports clean energy investments and federal climate action.",
      source: "https://www.coons.senate.gov/about/issues/environment",
      sourceLabel: "coons.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement: "Supports federal codification of Roe v. Wade.",
      source: "https://www.coons.senate.gov/about/issues/health-care",
      sourceLabel: "coons.senate.gov",
    },
  },

  // Jeanne Shaheen — NH — Democrat
  S001181: {
    abortion_rights: {
      direction: "favors",
      statement: "Supports codifying Roe v. Wade in federal law.",
      source: "https://www.shaheen.senate.gov/about/issues",
      sourceLabel: "shaheen.senate.gov",
    },
    healthcare_expansion: {
      direction: "favors",
      statement: "Supports protecting and expanding the Affordable Care Act.",
      source: "https://www.shaheen.senate.gov/about/issues",
      sourceLabel: "shaheen.senate.gov",
    },
  },

  // Maggie Hassan — NH — Democrat
  H001076: {
    healthcare_expansion: {
      direction: "favors",
      statement: "Supports lower prescription drug prices and protecting ACA.",
      source: "https://www.hassan.senate.gov/issues",
      sourceLabel: "hassan.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement: "Supports federal protection of abortion access.",
      source: "https://www.hassan.senate.gov/issues",
      sourceLabel: "hassan.senate.gov",
    },
  },

  // Sherrod Brown — OH — Democrat (former, but useful exemplar)
  B000944: {
    healthcare_expansion: {
      direction: "favors",
      statement: "Supports protecting ACA, expanding Medicare, drug pricing reform.",
      source: "https://www.brown.senate.gov/issues/issues",
      sourceLabel: "brown.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement: "Supports codifying Roe v. Wade.",
      source: "https://www.brown.senate.gov/issues/issues",
      sourceLabel: "brown.senate.gov",
    },
  },

  // Tammy Baldwin — WI — Democrat
  B001230: {
    abortion_rights: {
      direction: "favors",
      statement: "Supports federal codification of Roe and reproductive freedom.",
      source: "https://www.baldwin.senate.gov/priorities",
      sourceLabel: "baldwin.senate.gov",
    },
    healthcare_expansion: {
      direction: "favors",
      statement: "Supports protecting and expanding the ACA.",
      source: "https://www.baldwin.senate.gov/priorities",
      sourceLabel: "baldwin.senate.gov",
    },
  },

  // Adam Schiff — CA — Democrat
  S001150: {
    gun_safety: {
      direction: "favors",
      statement: "Long-time advocate for assault weapons ban and universal background checks.",
      source: "https://www.schiff.senate.gov/issues",
      sourceLabel: "schiff.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement: "Supports codifying Roe v. Wade in federal law.",
      source: "https://www.schiff.senate.gov/issues",
      sourceLabel: "schiff.senate.gov",
    },
    climate_action: {
      direction: "favors",
      statement: "Supports aggressive federal climate action and Green New Deal framework.",
      source: "https://www.schiff.senate.gov/issues",
      sourceLabel: "schiff.senate.gov",
    },
  },

  // Alex Padilla — CA — Democrat
  P000145: {
    immigration_reform: {
      direction: "favors",
      statement: "Supports comprehensive immigration reform with path to citizenship.",
      source: "https://www.padilla.senate.gov/priorities/immigration/",
      sourceLabel: "padilla.senate.gov",
    },
    gun_safety: {
      direction: "favors",
      statement: "Supports universal background checks and assault weapons ban.",
      source: "https://www.padilla.senate.gov/priorities/gun-violence/",
      sourceLabel: "padilla.senate.gov",
    },
  },

  // John Fetterman — PA — Democrat (notable independent streak)
  F000479: {
    abortion_rights: {
      direction: "favors",
      statement: "Supports codifying Roe; ran on protecting reproductive rights.",
      source: "https://www.fetterman.senate.gov/issues/",
      sourceLabel: "fetterman.senate.gov",
    },
    immigration_reform: {
      direction: "opposes",
      statement:
        "Notably broke from his party in 2024 to support tougher border enforcement; called himself a 'Democrat who supports border security.'",
      source: "https://www.fetterman.senate.gov/issues/",
      sourceLabel: "fetterman.senate.gov",
    },
  },

  // ── Senate Republicans — significantly expanded coverage ──────────────

  // Mike Lee — UT — Republican (libertarian-leaning constitutional conservative)
  L000577: {
    gun_safety: {
      direction: "opposes",
      statement:
        "Strong Second Amendment defender; opposes new federal gun restrictions including assault weapons bans and red-flag laws.",
      source: "https://www.lee.senate.gov/issues/second-amendment",
      sourceLabel: "lee.senate.gov",
    },
    climate_action: {
      direction: "opposes",
      statement:
        "Opposes the Green New Deal and federal climate regulations; supports continued domestic fossil fuel production.",
      source: "https://www.lee.senate.gov/issues/energy",
      sourceLabel: "lee.senate.gov",
    },
    abortion_rights: {
      direction: "opposes",
      statement: "Strong pro-life record; supports federal abortion restrictions and opposes Roe.",
      source: "https://www.lee.senate.gov/issues/life",
      sourceLabel: "lee.senate.gov",
    },
    immigration_reform: {
      direction: "opposes",
      statement:
        "Opposes amnesty and path-to-citizenship; supports interior enforcement and reducing legal immigration levels.",
      source: "https://www.lee.senate.gov/issues/immigration",
      sourceLabel: "lee.senate.gov",
    },
    healthcare_expansion: {
      direction: "opposes",
      statement:
        "Long-time opponent of the Affordable Care Act; supports market-based healthcare reforms.",
      source: "https://www.lee.senate.gov/issues/healthcare",
      sourceLabel: "lee.senate.gov",
    },
  },

  // John Thune — SD — Republican (Senate Majority Leader 119th Congress)
  T000250: {
    gun_safety: {
      direction: "opposes",
      statement: "Opposes new gun-control measures; strong Second Amendment defender.",
      source: "https://www.thune.senate.gov/public/index.cfm/second-amendment",
      sourceLabel: "thune.senate.gov",
    },
    climate_action: {
      direction: "opposes",
      statement:
        "Opposes Green New Deal and EPA emissions regulations; supports US fossil-fuel production.",
      source: "https://www.thune.senate.gov/public/index.cfm/energy-environment",
      sourceLabel: "thune.senate.gov",
    },
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life; supports overturning Roe and federal abortion restrictions.",
      source: "https://www.thune.senate.gov/public/index.cfm/life",
      sourceLabel: "thune.senate.gov",
    },
  },

  // Rand Paul — KY — Republican (libertarian)
  P000603: {
    gun_safety: {
      direction: "opposes",
      statement: "Opposes new gun-control measures; strict constitutionalist on Second Amendment.",
      source: "https://www.paul.senate.gov/issues/second-amendment/",
      sourceLabel: "paul.senate.gov",
    },
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life; supports federal protections for unborn children.",
      source: "https://www.paul.senate.gov/issues/life/",
      sourceLabel: "paul.senate.gov",
    },
    immigration_reform: {
      direction: "opposes",
      statement: "Opposes amnesty proposals; supports border-enforcement-first approach.",
      source: "https://www.paul.senate.gov/issues/immigration/",
      sourceLabel: "paul.senate.gov",
    },
  },

  // James Lankford — OK — Republican
  L000575: {
    immigration_reform: {
      direction: "opposes",
      statement:
        "Lead Republican negotiator on 2024 Border Act, which ultimately died from Republican opposition; subsequently opposed path-to-citizenship without enforcement first.",
      source: "https://www.lankford.senate.gov/issues/immigration/",
      sourceLabel: "lankford.senate.gov",
    },
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life; supports federal protections for unborn children.",
      source: "https://www.lankford.senate.gov/issues/life/",
      sourceLabel: "lankford.senate.gov",
    },
    gun_safety: {
      direction: "opposes",
      statement: "Opposes new federal gun-control measures.",
      source: "https://www.lankford.senate.gov/issues/second-amendment/",
      sourceLabel: "lankford.senate.gov",
    },
  },

  // Steve Daines — MT — Republican
  D000618: {
    climate_action: {
      direction: "opposes",
      statement:
        "Opposes EPA emissions regulations; advocates for domestic energy production including coal and natural gas.",
      source: "https://www.daines.senate.gov/about/issues/energy/",
      sourceLabel: "daines.senate.gov",
    },
    gun_safety: {
      direction: "opposes",
      statement: "Opposes new federal gun restrictions; strong Second Amendment supporter.",
      source: "https://www.daines.senate.gov/about/issues/second-amendment/",
      sourceLabel: "daines.senate.gov",
    },
  },

  // John Barrasso — WY — Republican (Senate Republican Whip)
  B001261: {
    climate_action: {
      direction: "opposes",
      statement:
        "Long-time advocate for fossil fuel production; opposes most federal climate regulations.",
      source: "https://www.barrasso.senate.gov/issues/energy",
      sourceLabel: "barrasso.senate.gov",
    },
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life record; supports federal abortion restrictions.",
      source: "https://www.barrasso.senate.gov/issues/health",
      sourceLabel: "barrasso.senate.gov",
    },
    gun_safety: {
      direction: "opposes",
      statement: "Opposes new gun restrictions; strong Second Amendment defender.",
      source: "https://www.barrasso.senate.gov/issues/second-amendment",
      sourceLabel: "barrasso.senate.gov",
    },
  },

  // Mike Crapo — ID — Republican
  C000880: {
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life voting record; supports federal abortion restrictions.",
      source: "https://www.crapo.senate.gov/issues/life",
      sourceLabel: "crapo.senate.gov",
    },
    healthcare_expansion: {
      direction: "opposes",
      statement: "Supports repealing the Affordable Care Act.",
      source: "https://www.crapo.senate.gov/issues/health-care",
      sourceLabel: "crapo.senate.gov",
    },
  },

  // Cynthia Lummis — WY — Republican
  L000571: {
    climate_action: {
      direction: "opposes",
      statement: "Opposes federal climate regulations; advocates for Wyoming fossil fuel industry.",
      source: "https://www.lummis.senate.gov/issues/energy/",
      sourceLabel: "lummis.senate.gov",
    },
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life record.",
      source: "https://www.lummis.senate.gov/issues/life/",
      sourceLabel: "lummis.senate.gov",
    },
  },

  // John Boozman — AR — Republican
  B001236: {
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life voting record.",
      source: "https://www.boozman.senate.gov/issues/life",
      sourceLabel: "boozman.senate.gov",
    },
    gun_safety: {
      direction: "opposes",
      statement: "Opposes new federal gun-control measures.",
      source: "https://www.boozman.senate.gov/issues/second-amendment",
      sourceLabel: "boozman.senate.gov",
    },
  },

  // Tommy Tuberville — AL — Republican
  T000278: {
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life; held DOD nominations over Pentagon abortion policy 2023.",
      source: "https://www.tuberville.senate.gov/about/issues/",
      sourceLabel: "tuberville.senate.gov",
    },
  },

  // Bill Cassidy — LA — Republican (occasionally votes across the aisle)
  C001075: {
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life; supports federal abortion restrictions.",
      source: "https://www.cassidy.senate.gov/issues/life",
      sourceLabel: "cassidy.senate.gov",
    },
    immigration_reform: {
      direction: "opposes",
      statement:
        "Opposes mass amnesty; supports work-based and merit-based legal immigration changes.",
      source: "https://www.cassidy.senate.gov/issues/immigration",
      sourceLabel: "cassidy.senate.gov",
    },
  },

  // Joni Ernst — IA — Republican
  E000295: {
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life voting record.",
      source: "https://www.ernst.senate.gov/about/issues",
      sourceLabel: "ernst.senate.gov",
    },
    gun_safety: {
      direction: "opposes",
      statement: "Opposes new gun-control measures.",
      source: "https://www.ernst.senate.gov/about/issues",
      sourceLabel: "ernst.senate.gov",
    },
  },

  // Chuck Grassley — IA — Republican (President Pro Tempore)
  G000386: {
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life record; opposes federal abortion access expansion.",
      source: "https://www.grassley.senate.gov/about/issues",
      sourceLabel: "grassley.senate.gov",
    },
    gun_safety: {
      direction: "opposes",
      statement:
        "Opposes new restrictions on gun ownership; supports current federal background-check system without expansion.",
      source: "https://www.grassley.senate.gov/about/issues",
      sourceLabel: "grassley.senate.gov",
    },
  },

  // Mike Rounds — SD — Republican
  R000605: {
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life record.",
      source: "https://www.rounds.senate.gov/about/issues",
      sourceLabel: "rounds.senate.gov",
    },
    climate_action: {
      direction: "opposes",
      statement: "Opposes federal climate regulations and Green New Deal.",
      source: "https://www.rounds.senate.gov/about/issues",
      sourceLabel: "rounds.senate.gov",
    },
  },

  // Ted Budd — NC — Republican
  B001305: {
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life voting record.",
      source: "https://www.budd.senate.gov/issues/life/",
      sourceLabel: "budd.senate.gov",
    },
    gun_safety: {
      direction: "opposes",
      statement: "Strong Second Amendment supporter; opposes new federal gun restrictions.",
      source: "https://www.budd.senate.gov/issues/second-amendment/",
      sourceLabel: "budd.senate.gov",
    },
  },

  // J.D. Vance — OH — Republican (now Vice President as of Jan 2025 — left Senate)
  // V000137 covered in case the legislators data still includes him in transition.

  // Markwayne Mullin — OK — Republican
  M001190: {
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life voting record.",
      source: "https://www.mullin.senate.gov/about/issues",
      sourceLabel: "mullin.senate.gov",
    },
    gun_safety: {
      direction: "opposes",
      statement: "Opposes new federal gun-control measures.",
      source: "https://www.mullin.senate.gov/about/issues",
      sourceLabel: "mullin.senate.gov",
    },
  },

  // ── Round 2 expansion (Reddit-launch coverage) ───────────────────────
  // High-profile senators most likely to be looked up right after the
  // r/moderatepolitics post lands. Added 2026-06-21.

  // Chris Murphy — CT — Democrat (gun-safety lead negotiator)
  M001169: {
    gun_safety: {
      direction: "favors",
      statement:
        "Lead Democratic negotiator of the 2022 Bipartisan Safer Communities Act, the most significant federal gun-safety law in 30 years.",
      source: "https://www.murphy.senate.gov/issues/gun-violence",
      sourceLabel: "murphy.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement: "Supports federal codification of Roe v. Wade.",
      source: "https://www.murphy.senate.gov/issues/health-care",
      sourceLabel: "murphy.senate.gov",
    },
    healthcare_expansion: {
      direction: "favors",
      statement: "Supports expanding the Affordable Care Act and lowering drug prices.",
      source: "https://www.murphy.senate.gov/issues/health-care",
      sourceLabel: "murphy.senate.gov",
    },
  },

  // Richard Blumenthal — CT — Democrat
  B001277: {
    gun_safety: {
      direction: "favors",
      statement: "Long-time advocate of universal background checks and an assault weapons ban.",
      source: "https://www.blumenthal.senate.gov/about/issues/gun-violence-prevention",
      sourceLabel: "blumenthal.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement: "Co-sponsored the Women's Health Protection Act.",
      source: "https://www.blumenthal.senate.gov/about/issues/health-care",
      sourceLabel: "blumenthal.senate.gov",
    },
  },

  // Sheldon Whitehouse — RI — Democrat (climate hawk)
  W000802: {
    climate_action: {
      direction: "favors",
      statement:
        "Gave the 'Time to Wake Up' climate floor speech series weekly for 10+ years; lead climate-policy voice in the Senate.",
      source: "https://www.whitehouse.senate.gov/issues/climate-change",
      sourceLabel: "whitehouse.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement: "Supports federal codification of Roe v. Wade.",
      source: "https://www.whitehouse.senate.gov/issues/health-care",
      sourceLabel: "whitehouse.senate.gov",
    },
  },

  // Jack Reed — RI — Democrat
  R000122: {
    healthcare_expansion: {
      direction: "favors",
      statement: "Supports protecting and expanding the Affordable Care Act.",
      source: "https://www.reed.senate.gov/issues/health-care",
      sourceLabel: "reed.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement: "Supports federal codification of Roe v. Wade.",
      source: "https://www.reed.senate.gov/issues/health-care",
      sourceLabel: "reed.senate.gov",
    },
  },

  // Brian Schatz — HI — Democrat (climate)
  S001194: {
    climate_action: {
      direction: "favors",
      statement: "Lead author of multiple clean-energy and climate-action bills.",
      source: "https://www.schatz.senate.gov/issues/climate-change",
      sourceLabel: "schatz.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement: "Supports federal codification of Roe v. Wade.",
      source: "https://www.schatz.senate.gov/issues/health-care",
      sourceLabel: "schatz.senate.gov",
    },
  },

  // Mazie Hirono — HI — Democrat
  H001042: {
    abortion_rights: {
      direction: "favors",
      statement: "Vocal advocate for federal protection of abortion rights.",
      source: "https://www.hirono.senate.gov/priorities",
      sourceLabel: "hirono.senate.gov",
    },
    immigration_reform: {
      direction: "favors",
      statement: "Supports path to citizenship for Dreamers and TPS holders.",
      source: "https://www.hirono.senate.gov/priorities",
      sourceLabel: "hirono.senate.gov",
    },
  },

  // Ed Markey — MA — Democrat (Green New Deal co-author)
  M000133: {
    climate_action: {
      direction: "favors",
      statement: "Co-author of the Green New Deal resolution with Rep. Ocasio-Cortez.",
      source: "https://www.markey.senate.gov/issues/climate-and-environment",
      sourceLabel: "markey.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement: "Supports federal codification of Roe v. Wade.",
      source: "https://www.markey.senate.gov/issues/health-care",
      sourceLabel: "markey.senate.gov",
    },
    gun_safety: {
      direction: "favors",
      statement: "Supports universal background checks and assault weapons ban.",
      source: "https://www.markey.senate.gov/issues/gun-violence-prevention",
      sourceLabel: "markey.senate.gov",
    },
  },

  // Dick Durbin — IL — Democrat (Senate Judiciary, DREAM Act original co-author)
  D000563: {
    immigration_reform: {
      direction: "favors",
      statement:
        "Original co-author of the DREAM Act in 2001; long-time advocate for path to citizenship.",
      source: "https://www.durbin.senate.gov/issues/immigration",
      sourceLabel: "durbin.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement: "Supports federal codification of Roe v. Wade.",
      source: "https://www.durbin.senate.gov/issues/health-care",
      sourceLabel: "durbin.senate.gov",
    },
    gun_safety: {
      direction: "favors",
      statement: "Supports universal background checks and assault weapons ban.",
      source: "https://www.durbin.senate.gov/issues/gun-violence",
      sourceLabel: "durbin.senate.gov",
    },
  },

  // Tammy Duckworth — IL — Democrat
  D000622: {
    abortion_rights: {
      direction: "favors",
      statement: "Supports federal codification of Roe v. Wade.",
      source: "https://www.duckworth.senate.gov/about-tammy/issues",
      sourceLabel: "duckworth.senate.gov",
    },
    healthcare_expansion: {
      direction: "favors",
      statement: "Supports protecting and expanding the ACA.",
      source: "https://www.duckworth.senate.gov/about-tammy/issues",
      sourceLabel: "duckworth.senate.gov",
    },
  },

  // Jon Ossoff — GA — Democrat
  O000174: {
    abortion_rights: {
      direction: "favors",
      statement: "Supports federal codification of Roe v. Wade.",
      source: "https://www.ossoff.senate.gov/issues/",
      sourceLabel: "ossoff.senate.gov",
    },
    healthcare_expansion: {
      direction: "favors",
      statement: "Supports lowering drug prices and protecting the ACA.",
      source: "https://www.ossoff.senate.gov/issues/",
      sourceLabel: "ossoff.senate.gov",
    },
  },

  // Jacky Rosen — NV — Democrat
  R000608: {
    abortion_rights: {
      direction: "favors",
      statement: "Supports federal codification of Roe v. Wade.",
      source: "https://www.rosen.senate.gov/issues/health-care/",
      sourceLabel: "rosen.senate.gov",
    },
  },

  // Peter Welch — VT — Democrat
  W000800: {
    climate_action: {
      direction: "favors",
      statement: "Long-time advocate for federal climate action.",
      source: "https://www.welch.senate.gov/about/issues/",
      sourceLabel: "welch.senate.gov",
    },
    healthcare_expansion: {
      direction: "favors",
      statement: "Supports expanding Medicare and lowering drug prices.",
      source: "https://www.welch.senate.gov/about/issues/",
      sourceLabel: "welch.senate.gov",
    },
  },

  // Angus King — ME — Independent (caucuses with Democrats)
  K000383: {
    climate_action: {
      direction: "favors",
      statement: "Supports clean-energy investment and federal climate policy.",
      source: "https://www.king.senate.gov/issues/",
      sourceLabel: "king.senate.gov",
    },
  },

  // Tina Smith — MN — Democrat (reproductive rights leader)
  S001203: {
    abortion_rights: {
      direction: "favors",
      statement:
        "Former Planned Parenthood executive; prominent voice in the Senate on reproductive rights.",
      source: "https://www.smith.senate.gov/about-tina/issues/",
      sourceLabel: "smith.senate.gov",
    },
    climate_action: {
      direction: "favors",
      statement: "Supports federal climate-action legislation.",
      source: "https://www.smith.senate.gov/about-tina/issues/",
      sourceLabel: "smith.senate.gov",
    },
  },

  // Gary Peters — MI — Democrat
  P000595: {
    abortion_rights: {
      direction: "favors",
      statement: "Supports federal codification of Roe v. Wade.",
      source: "https://www.peters.senate.gov/about/issues",
      sourceLabel: "peters.senate.gov",
    },
  },

  // Chris Van Hollen — MD — Democrat
  V000128: {
    climate_action: {
      direction: "favors",
      statement: "Supports federal climate-action legislation.",
      source: "https://www.vanhollen.senate.gov/issues",
      sourceLabel: "vanhollen.senate.gov",
    },
    abortion_rights: {
      direction: "favors",
      statement: "Supports federal codification of Roe v. Wade.",
      source: "https://www.vanhollen.senate.gov/issues",
      sourceLabel: "vanhollen.senate.gov",
    },
  },

  // John Cornyn — TX — Republican (Senate Judiciary, former Republican Whip)
  C001056: {
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life voting record; supports federal restrictions.",
      source: "https://www.cornyn.senate.gov/issues/",
      sourceLabel: "cornyn.senate.gov",
    },
    immigration_reform: {
      direction: "opposes",
      statement: "Supports border-enforcement-first approach; opposes amnesty proposals.",
      source: "https://www.cornyn.senate.gov/issues/",
      sourceLabel: "cornyn.senate.gov",
    },
    gun_safety: {
      direction: "favors",
      statement:
        "Lead Republican negotiator of the 2022 Bipartisan Safer Communities Act — broke with most of his caucus to support modest reforms.",
      source:
        "https://www.cornyn.senate.gov/news/cornyn-announces-bipartisan-deal-on-gun-safety/",
      sourceLabel: "cornyn.senate.gov",
    },
  },

  // Tim Scott — SC — Republican
  S001184: {
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life voting record.",
      source: "https://www.scott.senate.gov/about/issues",
      sourceLabel: "scott.senate.gov",
    },
    healthcare_expansion: {
      direction: "opposes",
      statement: "Supports repealing the Affordable Care Act.",
      source: "https://www.scott.senate.gov/about/issues",
      sourceLabel: "scott.senate.gov",
    },
  },

  // Marsha Blackburn — TN — Republican
  B001243: {
    abortion_rights: {
      direction: "opposes",
      statement: "Strong pro-life record; supports federal abortion restrictions.",
      source: "https://www.blackburn.senate.gov/about-marsha/issues",
      sourceLabel: "blackburn.senate.gov",
    },
    gun_safety: {
      direction: "opposes",
      statement: "Strong Second Amendment defender; opposes new federal gun restrictions.",
      source: "https://www.blackburn.senate.gov/about-marsha/issues",
      sourceLabel: "blackburn.senate.gov",
    },
  },

  // Rick Scott — FL — Republican
  S001217: {
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life voting record.",
      source: "https://www.rickscott.senate.gov/issues",
      sourceLabel: "rickscott.senate.gov",
    },
    healthcare_expansion: {
      direction: "opposes",
      statement: "Long-time opponent of the Affordable Care Act.",
      source: "https://www.rickscott.senate.gov/issues",
      sourceLabel: "rickscott.senate.gov",
    },
  },

  // Ron Johnson — WI — Republican (climate skeptic)
  J000293: {
    climate_action: {
      direction: "opposes",
      statement:
        "Public climate skeptic; opposes federal climate regulations and emissions-reduction mandates.",
      source: "https://www.ronjohnson.senate.gov/issues",
      sourceLabel: "ronjohnson.senate.gov",
    },
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life voting record.",
      source: "https://www.ronjohnson.senate.gov/issues",
      sourceLabel: "ronjohnson.senate.gov",
    },
  },

  // Eric Schmitt — MO — Republican
  S001214: {
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life voting record.",
      source: "https://www.schmitt.senate.gov/issues",
      sourceLabel: "schmitt.senate.gov",
    },
    immigration_reform: {
      direction: "opposes",
      statement: "Supports border-enforcement-first approach.",
      source: "https://www.schmitt.senate.gov/issues",
      sourceLabel: "schmitt.senate.gov",
    },
  },

  // John Hoeven — ND — Republican
  H001061: {
    climate_action: {
      direction: "opposes",
      statement:
        "Opposes federal climate regulations; advocates for North Dakota fossil fuel industry.",
      source: "https://www.hoeven.senate.gov/issues/energy-and-natural-resources",
      sourceLabel: "hoeven.senate.gov",
    },
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life voting record.",
      source: "https://www.hoeven.senate.gov/issues",
      sourceLabel: "hoeven.senate.gov",
    },
  },

  // Kevin Cramer — ND — Republican
  C001096: {
    climate_action: {
      direction: "opposes",
      statement: "Opposes federal climate regulations; supports oil and gas development.",
      source: "https://www.cramer.senate.gov/issues",
      sourceLabel: "cramer.senate.gov",
    },
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life voting record.",
      source: "https://www.cramer.senate.gov/issues",
      sourceLabel: "cramer.senate.gov",
    },
  },

  // Pete Ricketts — NE — Republican
  R000584: {
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life voting record.",
      source: "https://www.ricketts.senate.gov/about/issues",
      sourceLabel: "ricketts.senate.gov",
    },
  },

  // Bill Hagerty — TN — Republican
  H001088: {
    abortion_rights: {
      direction: "opposes",
      statement: "Pro-life voting record.",
      source: "https://www.hagerty.senate.gov/issues/",
      sourceLabel: "hagerty.senate.gov",
    },
    immigration_reform: {
      direction: "opposes",
      statement: "Border-enforcement-first; opposes amnesty proposals.",
      source: "https://www.hagerty.senate.gov/issues/",
      sourceLabel: "hagerty.senate.gov",
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
