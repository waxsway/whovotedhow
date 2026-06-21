import { NextResponse } from "next/server";
import { getCandidatesByState } from "@/lib/data/candidates";

// Returns federal candidates (Senate + House) currently running for
// office in the given state for the active election cycle. Incumbents
// are suppressed (they're already in the legislators roster); only
// challengers and open-seat candidates are returned.

export const runtime = "nodejs";
// 12 hours: FEC candidate registration data updates daily as new
// filings land, but for an educational tool half-day freshness is
// plenty.
export const revalidate = 43200;

const STATE_RE = /^[A-Z]{2}$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ state: string }> }
) {
  const { state } = await params;
  const upper = (state || "").toUpperCase();
  if (!upper || !STATE_RE.test(upper)) {
    return NextResponse.json(
      { error: "Invalid state (must be 2-letter USPS code)" },
      { status: 400 }
    );
  }

  try {
    const report = await getCandidatesByState(upper);
    return NextResponse.json(report, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=600, s-maxage=43200, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/candidates] failed", upper, msg);
    return NextResponse.json(
      { error: "Failed to load candidates", detail: msg },
      { status: 500 }
    );
  }
}
