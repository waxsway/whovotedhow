import { NextResponse } from "next/server";
import { getCommitteesByBioguide } from "@/lib/data/committees";

// Returns committee + subcommittee assignments for the given legislator,
// drawn from the unitedstates/congress-legislators committee-membership
// YAML. Includes leadership designation (Chair / Ranking Member / Vice
// Chair) when held.

export const runtime = "nodejs";
// 24h: committee rosters shift occasionally (gavel handoffs, seat
// reshuffles) but rarely day-to-day. Daily freshness is plenty.
export const revalidate = 86400;

const BIOGUIDE_RE = /^[A-Z][0-9]{6}$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bioguide: string }> }
) {
  const { bioguide } = await params;
  if (!bioguide || !BIOGUIDE_RE.test(bioguide)) {
    return NextResponse.json(
      { error: "Invalid bioguide id" },
      { status: 400 }
    );
  }

  try {
    const report = await getCommitteesByBioguide(bioguide);
    return NextResponse.json(report, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/committees] failed", bioguide, msg);
    return NextResponse.json(
      { error: "Failed to load committees", detail: msg },
      { status: 500 }
    );
  }
}
