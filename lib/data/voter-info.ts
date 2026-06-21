// Voter information per state. The educational mission flips here from
// "learn about your representatives" to "go do something with what you
// learned" — registration, polling place lookup, problem reporting.
//
// Sources used:
//   - vote.gov — federal portal maintained by the General Services
//     Administration. Each state has a deterministic /register/{slug}
//     and /find-your-polling-place page, and they handle the redirect
//     to the state's actual portal. Using vote.gov as the entry point
//     means our links survive when individual states reorganize their
//     SOS websites.
//   - Each state's Secretary of State or Board of Elections election
//     division. Hand-curated to the official .gov landing page (NOT
//     home page of the SOS — the elections page specifically).
//   - Election Protection — nonpartisan voter assistance hotline run
//     by the Lawyers' Committee for Civil Rights. 866-OUR-VOTE.
//
// We deliberately do NOT encode:
//   - Registration deadlines (vary by election + state policy churn)
//   - Voter ID rules in detail (categorization changes, state-by-state
//     statutes shift — let the official sources be authoritative)
//   - "Next election" dates (federal cycle + state primaries + local
//     races would all need to be tracked; out of scope)
//
// The job here is to be the GATEWAY, not the full reference. Each row
// should be reliable for 5+ years without maintenance.

export type StateVoterInfo = {
  stateCode: string;
  stateName: string;
  // Slug used by vote.gov for /register/{slug}, /find-your-polling-place/{slug}
  voteGovSlug: string;
  // Official state election authority — SOS election division or
  // dedicated board of elections. Hand-checked .gov URL.
  officialElectionUrl: string;
  officialAuthorityName: string;
};

const RAW: Array<Omit<StateVoterInfo, "voteGovSlug">> = [
  {
    stateCode: "AL",
    stateName: "Alabama",
    officialElectionUrl: "https://www.sos.alabama.gov/alabama-votes",
    officialAuthorityName: "Alabama Secretary of State",
  },
  {
    stateCode: "AK",
    stateName: "Alaska",
    officialElectionUrl: "https://www.elections.alaska.gov/",
    officialAuthorityName: "Alaska Division of Elections",
  },
  {
    stateCode: "AZ",
    stateName: "Arizona",
    officialElectionUrl: "https://azsos.gov/elections",
    officialAuthorityName: "Arizona Secretary of State",
  },
  {
    stateCode: "AR",
    stateName: "Arkansas",
    officialElectionUrl: "https://www.sos.arkansas.gov/elections",
    officialAuthorityName: "Arkansas Secretary of State",
  },
  {
    stateCode: "CA",
    stateName: "California",
    officialElectionUrl: "https://www.sos.ca.gov/elections",
    officialAuthorityName: "California Secretary of State",
  },
  {
    stateCode: "CO",
    stateName: "Colorado",
    officialElectionUrl: "https://www.sos.state.co.us/pubs/elections/",
    officialAuthorityName: "Colorado Secretary of State",
  },
  {
    stateCode: "CT",
    stateName: "Connecticut",
    officialElectionUrl: "https://portal.ct.gov/SOTS/Election-Services/Election-Services-Home",
    officialAuthorityName: "Connecticut Secretary of the State",
  },
  {
    stateCode: "DE",
    stateName: "Delaware",
    officialElectionUrl: "https://elections.delaware.gov/",
    officialAuthorityName: "Delaware Department of Elections",
  },
  {
    stateCode: "DC",
    stateName: "District of Columbia",
    officialElectionUrl: "https://www.dcboe.org/",
    officialAuthorityName: "DC Board of Elections",
  },
  {
    stateCode: "FL",
    stateName: "Florida",
    officialElectionUrl: "https://dos.fl.gov/elections/",
    officialAuthorityName: "Florida Department of State",
  },
  {
    stateCode: "GA",
    stateName: "Georgia",
    officialElectionUrl: "https://sos.ga.gov/elections-division-georgia-secretary-states-office",
    officialAuthorityName: "Georgia Secretary of State",
  },
  {
    stateCode: "HI",
    stateName: "Hawaii",
    officialElectionUrl: "https://elections.hawaii.gov/",
    officialAuthorityName: "Hawaii Office of Elections",
  },
  {
    stateCode: "ID",
    stateName: "Idaho",
    officialElectionUrl: "https://sos.idaho.gov/elections-division/",
    officialAuthorityName: "Idaho Secretary of State",
  },
  {
    stateCode: "IL",
    stateName: "Illinois",
    officialElectionUrl: "https://www.elections.il.gov/",
    officialAuthorityName: "Illinois State Board of Elections",
  },
  {
    stateCode: "IN",
    stateName: "Indiana",
    officialElectionUrl: "https://www.in.gov/sos/elections/",
    officialAuthorityName: "Indiana Secretary of State",
  },
  {
    stateCode: "IA",
    stateName: "Iowa",
    officialElectionUrl: "https://sos.iowa.gov/elections/",
    officialAuthorityName: "Iowa Secretary of State",
  },
  {
    stateCode: "KS",
    stateName: "Kansas",
    officialElectionUrl: "https://sos.ks.gov/elections/elections.html",
    officialAuthorityName: "Kansas Secretary of State",
  },
  {
    stateCode: "KY",
    stateName: "Kentucky",
    officialElectionUrl: "https://elect.ky.gov/",
    officialAuthorityName: "Kentucky State Board of Elections",
  },
  {
    stateCode: "LA",
    stateName: "Louisiana",
    officialElectionUrl: "https://www.sos.la.gov/ElectionsAndVoting/Pages/default.aspx",
    officialAuthorityName: "Louisiana Secretary of State",
  },
  {
    stateCode: "ME",
    stateName: "Maine",
    officialElectionUrl: "https://www.maine.gov/sos/cec/elec/",
    officialAuthorityName: "Maine Secretary of State",
  },
  {
    stateCode: "MD",
    stateName: "Maryland",
    officialElectionUrl: "https://elections.maryland.gov/",
    officialAuthorityName: "Maryland State Board of Elections",
  },
  {
    stateCode: "MA",
    stateName: "Massachusetts",
    officialElectionUrl: "https://www.sec.state.ma.us/divisions/elections/elections-and-voting.htm",
    officialAuthorityName: "Massachusetts Secretary of the Commonwealth",
  },
  {
    stateCode: "MI",
    stateName: "Michigan",
    officialElectionUrl: "https://www.michigan.gov/sos/elections",
    officialAuthorityName: "Michigan Secretary of State",
  },
  {
    stateCode: "MN",
    stateName: "Minnesota",
    officialElectionUrl: "https://www.sos.state.mn.us/elections-voting/",
    officialAuthorityName: "Minnesota Secretary of State",
  },
  {
    stateCode: "MS",
    stateName: "Mississippi",
    officialElectionUrl: "https://www.sos.ms.gov/elections-voting",
    officialAuthorityName: "Mississippi Secretary of State",
  },
  {
    stateCode: "MO",
    stateName: "Missouri",
    officialElectionUrl: "https://www.sos.mo.gov/elections",
    officialAuthorityName: "Missouri Secretary of State",
  },
  {
    stateCode: "MT",
    stateName: "Montana",
    officialElectionUrl: "https://sosmt.gov/elections/",
    officialAuthorityName: "Montana Secretary of State",
  },
  {
    stateCode: "NE",
    stateName: "Nebraska",
    officialElectionUrl: "https://sos.nebraska.gov/elections",
    officialAuthorityName: "Nebraska Secretary of State",
  },
  {
    stateCode: "NV",
    stateName: "Nevada",
    officialElectionUrl: "https://www.nvsos.gov/sos/elections",
    officialAuthorityName: "Nevada Secretary of State",
  },
  {
    stateCode: "NH",
    stateName: "New Hampshire",
    officialElectionUrl: "https://www.sos.nh.gov/elections",
    officialAuthorityName: "New Hampshire Secretary of State",
  },
  {
    stateCode: "NJ",
    stateName: "New Jersey",
    officialElectionUrl: "https://www.nj.gov/state/elections/",
    officialAuthorityName: "New Jersey Division of Elections",
  },
  {
    stateCode: "NM",
    stateName: "New Mexico",
    officialElectionUrl: "https://www.sos.nm.gov/voting-and-elections/",
    officialAuthorityName: "New Mexico Secretary of State",
  },
  {
    stateCode: "NY",
    stateName: "New York",
    officialElectionUrl: "https://elections.ny.gov/",
    officialAuthorityName: "New York State Board of Elections",
  },
  {
    stateCode: "NC",
    stateName: "North Carolina",
    officialElectionUrl: "https://www.ncsbe.gov/",
    officialAuthorityName: "North Carolina State Board of Elections",
  },
  {
    stateCode: "ND",
    stateName: "North Dakota",
    officialElectionUrl: "https://vip.sos.nd.gov/",
    officialAuthorityName: "North Dakota Secretary of State",
  },
  {
    stateCode: "OH",
    stateName: "Ohio",
    officialElectionUrl: "https://www.ohiosos.gov/elections/",
    officialAuthorityName: "Ohio Secretary of State",
  },
  {
    stateCode: "OK",
    stateName: "Oklahoma",
    officialElectionUrl: "https://oklahoma.gov/elections.html",
    officialAuthorityName: "Oklahoma State Election Board",
  },
  {
    stateCode: "OR",
    stateName: "Oregon",
    officialElectionUrl: "https://sos.oregon.gov/voting/Pages/default.aspx",
    officialAuthorityName: "Oregon Secretary of State",
  },
  {
    stateCode: "PA",
    stateName: "Pennsylvania",
    officialElectionUrl: "https://www.vote.pa.gov/",
    officialAuthorityName: "Pennsylvania Department of State",
  },
  {
    stateCode: "RI",
    stateName: "Rhode Island",
    officialElectionUrl: "https://elections.ri.gov/",
    officialAuthorityName: "Rhode Island Board of Elections",
  },
  {
    stateCode: "SC",
    stateName: "South Carolina",
    officialElectionUrl: "https://www.scvotes.gov/",
    officialAuthorityName: "South Carolina State Election Commission",
  },
  {
    stateCode: "SD",
    stateName: "South Dakota",
    officialElectionUrl: "https://sdsos.gov/elections-voting/",
    officialAuthorityName: "South Dakota Secretary of State",
  },
  {
    stateCode: "TN",
    stateName: "Tennessee",
    officialElectionUrl: "https://sos.tn.gov/elections",
    officialAuthorityName: "Tennessee Secretary of State",
  },
  {
    stateCode: "TX",
    stateName: "Texas",
    officialElectionUrl: "https://www.sos.state.tx.us/elections/",
    officialAuthorityName: "Texas Secretary of State",
  },
  {
    stateCode: "UT",
    stateName: "Utah",
    officialElectionUrl: "https://elections.utah.gov/",
    officialAuthorityName: "Utah Lieutenant Governor",
  },
  {
    stateCode: "VT",
    stateName: "Vermont",
    officialElectionUrl: "https://sos.vermont.gov/elections/",
    officialAuthorityName: "Vermont Secretary of State",
  },
  {
    stateCode: "VA",
    stateName: "Virginia",
    officialElectionUrl: "https://www.elections.virginia.gov/",
    officialAuthorityName: "Virginia Department of Elections",
  },
  {
    stateCode: "WA",
    stateName: "Washington",
    officialElectionUrl: "https://www.sos.wa.gov/elections",
    officialAuthorityName: "Washington Secretary of State",
  },
  {
    stateCode: "WV",
    stateName: "West Virginia",
    officialElectionUrl: "https://sos.wv.gov/elections/Pages/default.aspx",
    officialAuthorityName: "West Virginia Secretary of State",
  },
  {
    stateCode: "WI",
    stateName: "Wisconsin",
    officialElectionUrl: "https://elections.wi.gov/",
    officialAuthorityName: "Wisconsin Elections Commission",
  },
  {
    stateCode: "WY",
    stateName: "Wyoming",
    officialElectionUrl: "https://sos.wyo.gov/Elections/",
    officialAuthorityName: "Wyoming Secretary of State",
  },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

const VOTER_INFO: Record<string, StateVoterInfo> = Object.fromEntries(
  RAW.map((r) => [
    r.stateCode,
    { ...r, voteGovSlug: slugify(r.stateName) },
  ])
);

export function getVoterInfo(stateCode: string): StateVoterInfo | null {
  return VOTER_INFO[stateCode.toUpperCase()] ?? null;
}

export type VoterInfoLink = {
  label: string;
  url: string;
  description: string;
};

export function getVoterInfoLinks(info: StateVoterInfo): VoterInfoLink[] {
  return [
    {
      label: `Register to vote in ${info.stateName}`,
      url: `https://vote.gov/register/${info.voteGovSlug}`,
      description:
        "Federal voter registration portal (vote.gov) — confirms your eligibility and routes you to the official state form.",
    },
    {
      label: "Find your polling place",
      url: `https://vote.gov/find-your-polling-place/${info.voteGovSlug}`,
      description:
        "Polling place lookup, including early voting locations and hours.",
    },
    {
      label: `${info.officialAuthorityName} — elections division`,
      url: info.officialElectionUrl,
      description:
        "Official state election authority: registration deadlines, voter ID rules, sample ballots, and absentee/mail-in instructions.",
    },
    {
      label: "Report a problem at the polls — 866-OUR-VOTE",
      url: "https://866ourvote.org/",
      description:
        "Election Protection is a nonpartisan voter-assistance hotline run by the Lawyers' Committee for Civil Rights. Call 866-687-8683 if you face intimidation, machines down, or are turned away.",
    },
  ];
}
