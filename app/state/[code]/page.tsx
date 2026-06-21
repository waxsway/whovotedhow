import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MapApp from "@/components/MapApp";
import { stateByCode } from "@/lib/data/states";

// Deep-link route: /state/CA pre-selects California on the map and opens
// the detail panel showing every senator + rep for that state. Lets users
// share an entire state's delegation as a single URL.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const state = stateByCode((code || "").toUpperCase());
  if (!state) {
    return {
      title: "State — Who Voted How",
      description: "Free political accountability map.",
    };
  }
  const title = `${state.name} delegation — Who Voted How`;
  const description = `Every senator and representative from ${state.name} with their recent votes, top FEC donors, and accountability profile. Free, public-record data.`;
  const canonical = `https://whovotedhow.org/state/${state.code}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
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

export default async function StatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = (code || "").toUpperCase();
  const state = stateByCode(normalized);
  if (!state) notFound();
  return <MapApp initialState={normalized} />;
}
