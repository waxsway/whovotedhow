import { NextResponse } from "next/server";
import { getStatementAlignmentByBioguide } from "@/lib/data/statement-alignment";

// Statement-vs-vote alignment — the project's original thesis. Returns
// per-issue alignment ("did the legislator's stated position line up with
// how they actually voted?") for every issue we have a sourced public
// stance on. Returns 204 No Content when the legislator has no curated
// stances yet — UI falls back to the party-line proxy in that case.

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

  try {
    const result = await getStatementAlignmentByBioguide({
      bioguide,
      chamber: chamberParam,
    });
    if (result === null) {
      return NextResponse.json(
        { available: false, reason: "no_curated_stances" },
        {
          status: 200,
          headers: {
            "Cache-Control":
              "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
          },
        }
      );
    }
    return NextResponse.json(
      { available: true, ...result },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/statement-alignment] failed", bioguide, msg);
    return NextResponse.json(
      { error: "Failed to compute statement alignment", detail: msg },
      { status: 500 }
    );
  }
}
