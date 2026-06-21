import type { Metadata } from "next";
import MapApp from "@/components/MapApp";
import {
  findLegislatorByBioguide,
  type Party,
} from "@/lib/data/legislators";
import { stateByCode } from "@/lib/data/states";

// Deep-link route: visiting /legislator/{bioguide} renders the full app
// with that legislator's state pre-selected AND their card auto-expanded.
// Per-legislator metadata makes every URL share rich on X, iMessage,
// LinkedIn, Slack, Discord, Telegram, etc. via the opengraph-image.tsx
// generator co-located in this directory.

function partyAbbrev(p: Party): string {
  return p === "D" ? "D" : p === "R" ? "R" : p === "I" ? "I" : "Ind";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bioguide: string }>;
}): Promise<Metadata> {
  const { bioguide } = await params;
  let leg;
  try {
    leg = await findLegislatorByBioguide(bioguide);
  } catch {
    leg = null;
  }

  if (!leg) {
    return {
      title: "Legislator — Who Voted How",
      description:
        "Free political accountability map. Recent votes, top FEC donors, and a public-record profile for every member of the US Congress.",
    };
  }

  const state = stateByCode(leg.state);
  const stateName = state?.name ?? leg.state;
  const honorific = leg.chamber === "Senate" ? "Sen." : "Rep.";
  const partyState = `${partyAbbrev(leg.party)}-${leg.state}`;
  const title = `${honorific} ${leg.fullName} (${partyState}) — Who Voted How`;
  const description = `Recent roll-call votes, top FEC-recorded donors, and accountability profile for ${honorific} ${leg.fullName} (${partyAbbrev(leg.party)}-${stateName}). Free, public-record data from FEC.gov and Voteview.`;
  const canonical = `https://whovotedhow.org/legislator/${leg.bioguide}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "profile",
      title,
      description,
      url: canonical,
      siteName: "Who Voted How",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function LegislatorPage({
  params,
}: {
  params: Promise<{ bioguide: string }>;
}) {
  const { bioguide } = await params;
  return <MapApp initialLegislator={bioguide} />;
}
