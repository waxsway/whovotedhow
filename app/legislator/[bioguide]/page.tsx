import MapApp from "@/components/MapApp";

// Deep-link route: visiting /legislator/{bioguide} renders the full app
// with that legislator's state pre-selected AND their card auto-expanded
// in the side panel. This makes any politician's profile shareable as a
// single URL.

export default async function LegislatorPage({
  params,
}: {
  params: Promise<{ bioguide: string }>;
}) {
  const { bioguide } = await params;
  return <MapApp initialLegislator={bioguide} />;
}
