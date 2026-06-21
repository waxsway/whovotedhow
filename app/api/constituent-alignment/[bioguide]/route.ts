import { NextResponse } from "next/server";
import { getConstituentAlignmentByBioguide } from "@/lib/data/constituent-alignment";

// Constituent-vote alignment endpoint. Returns how often a legislator votes
// in the direction their state's electorate actually leans (Cook PVI 2025).
//
// Query parameters:
//   ?chamber=Senate|House (required — must match the legislator's chamber)
//   ?party=D|R|I          (required — legislator's caucus party)
//   ?state=XX             (required — 2-letter USPS state code)

export const runtime = "nodejs";
export const revalidate = 3600;

const BIOGUIDE_RE = /^[A-Z][0-9]{6}$/;
const STATE_RE = /^[A-Z]{2}$/;

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

  const stateParam = (searchParams.get("state") ?? "").toUpperCase();
  if (!STATE_RE.test(stateParam)) {
    return NextResponse.json(
      { error: "state query parameter must be a 2-letter USPS code" },
      { status: 400 }
    );
  }

  try {
    const result = await getConstituentAlignmentByBioguide({
      bioguide,
      party: partyParam,
      chamber: chamberParam,
      stateCode: stateParam,
    });
    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/constituent-alignment] failed", bioguide, msg);
    return NextResponse.json(
      { error: "Failed to compute constituent alignment", detail: msg },
      { status: 500 }
    );
  }
}
