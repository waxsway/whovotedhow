import { NextResponse } from "next/server";
import { getSponsoredBillsByBioguide } from "@/lib/data/bills";

// Returns bills sponsored by the given legislator from api.congress.gov.
// Amendments are filtered out — only primary legislation surfaces here
// (the accountability signal is clearer that way).

export const runtime = "nodejs";
// 24h: bills don't churn rapidly per member, and individual bill
// pages on the upstream are cached by Congress.gov on a similar
// timescale.
export const revalidate = 86400;

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
  const limitRaw = searchParams.get("limit");
  let limit = 10;
  if (limitRaw) {
    const n = Number(limitRaw);
    if (!Number.isFinite(n) || n < 1 || n > 30) {
      return NextResponse.json(
        { error: "Invalid limit (must be 1-30)" },
        { status: 400 }
      );
    }
    limit = n;
  }

  try {
    const report = await getSponsoredBillsByBioguide({ bioguide, limit });
    return NextResponse.json(report, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/bills] failed", bioguide, msg);
    return NextResponse.json(
      { error: "Failed to load sponsored bills", detail: msg },
      { status: 500 }
    );
  }
}
