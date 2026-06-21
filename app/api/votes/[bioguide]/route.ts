import { NextResponse } from "next/server";
import { getRecentVotesByBioguide } from "@/lib/data/votes";

// Returns recent roll-call votes for the requested bioguide id, joined
// with bill metadata from Voteview. Server-side because the upstream
// CSVs total ~10MB and we don't want to ship that to every client.
//
// Currently Senate-only (S118 + S119). Returns an empty array for any
// House member until we add the H-chamber data files to the cache.

export const runtime = "nodejs";
// Cache the response at the edge / Vercel CDN. Bills don't change after
// they happen, and a 1-hour cache window is fine for "recent votes."
export const revalidate = 3600;

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
    const votes = await getRecentVotesByBioguide(bioguide, 15);
    return NextResponse.json(
      { bioguide, votes },
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
