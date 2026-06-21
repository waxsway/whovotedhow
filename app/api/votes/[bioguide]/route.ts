import { NextResponse } from "next/server";
import { getRecentVotesByBioguide } from "@/lib/data/votes";

// Returns recent roll-call votes for the requested bioguide id, joined
// with bill metadata from Voteview. Server-side because the upstream
// CSVs total ~30 MB for both chambers and we don't want to ship that
// to every client. The chamber query parameter restricts which CSVs
// the server actually downloads, which matters because the House files
// alone are ~14 MB per Congress.

export const runtime = "nodejs";
export const revalidate = 3600;

const BIOGUIDE_RE = /^[A-Z][0-9]{6}$/;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ bioguide: string }> }
) {
  const { bioguide } = await params;

  if (!bioguide || !BIOGUIDE_RE.test(bioguide)) {
    return NextResponse.json(
      { error: "Invalid bioguide id" },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(req.url);
  const chamberParam = searchParams.get("chamber");
  let chamber: "Senate" | "House" | undefined;
  if (chamberParam === "Senate" || chamberParam === "House") {
    chamber = chamberParam;
  } else if (chamberParam) {
    return NextResponse.json(
      { error: "Invalid chamber (must be 'Senate' or 'House')" },
      { status: 400 }
    );
  }

  try {
    const votes = await getRecentVotesByBioguide(bioguide, { chamber });
    return NextResponse.json(
      { bioguide, chamber: chamber ?? null, votes },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/votes] failed", bioguide, msg);
    return NextResponse.json(
      { error: "Failed to load votes", detail: msg },
      { status: 500 }
    );
  }
}
