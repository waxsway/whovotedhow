import { NextResponse } from "next/server";
import { getJudgesByState } from "@/lib/data/judges";

// Returns currently-serving federal Article III judges associated with
// the given state: district court judges sitting in that state, circuit
// court judges whose circuit covers that state, and the nine Supreme
// Court justices (national, shown on every state's panel).

export const runtime = "nodejs";
// 7 days: judicial appointments don't change daily. Senate confirmations
// happen in waves and senior-status transitions are rare. A weekly
// refresh is plenty.
export const revalidate = 604800;

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
    const report = await getJudgesByState(upper);
    return NextResponse.json(report, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/judges] failed", upper, msg);
    return NextResponse.json(
      { error: "Failed to load judges", detail: msg },
      { status: 500 }
    );
  }
}
