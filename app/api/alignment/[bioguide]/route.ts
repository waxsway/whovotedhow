import { NextResponse } from "next/server";
import { getPartyAlignmentByBioguide } from "@/lib/data/votes";

// Returns a party-line consistency proxy score for the requested legislator.
// HONESTLY framed: this is NOT a "what they say vs what they vote" score
// (the original site thesis). That requires a structured statement source
// we haven't wired yet. This v1 is party-line loyalty computed from public
// Voteview data — useful by itself (sustained breaks from party are
// notable) and clearly labeled as a proxy in the UI.
//
// Query parameters:
//   ?chamber=Senate|House (required — must match the legislator's chamber)
//   ?party=D|R|I          (required — the party we score loyalty against)
//
// We make the client pass party rather than re-deriving it server-side
// because party can be ambiguous (Bernie Sanders is officially Independent
// but caucuses with Democrats — the UI should pass whichever party we
// score against, which is the legislator's caucus party as held in our
// roster).

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
  if (chamberParam !== "Senate" && chamberParam !== "House") {
    return NextResponse.json(
      { error: "chamber query parameter must be 'Senate' or 'House'" },
      { status: 400 }
    );
  }

  const partyParam = searchParams.get("party");
  if (partyParam !== "D" && partyParam !== "R" && partyParam !== "I") {
    return NextResponse.json(
      { error: "party query parameter must be 'D', 'R', or 'I'" },
      { status: 400 }
    );
  }

  try {
    const alignment = await getPartyAlignmentByBioguide({
      bioguide,
      party: partyParam,
      chamber: chamberParam,
    });
    return NextResponse.json(alignment, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/alignment] failed", bioguide, msg);
    return NextResponse.json(
      { error: "Failed to compute alignment", detail: msg },
      { status: 500 }
    );
  }
}
