import { NextResponse } from "next/server";
import { getStockTradesByBioguide } from "@/lib/data/stock-trades";

// Returns a legislator's most recent disclosed stock trades, drawn from
// community-maintained mirrors of the STOCK Act disclosures (Senate:
// efdsearch.senate.gov, House: disclosures-clerk.house.gov).

export const runtime = "nodejs";
// 6 hours in seconds (literal — Next.js static analysis can't evaluate
// `3600 * 6` as a segment config value).
export const revalidate = 21600;

const BIOGUIDE_RE = /^[A-Z][0-9]{6}$/;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ bioguide: string }> }
) {
  const { bioguide } = await params;
  if (!bioguide || !BIOGUIDE_RE.test(bioguide)) {
    return NextResponse.json({ error: "Invalid bioguide id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const limitRaw = searchParams.get("limit");
  let limit = 20;
  if (limitRaw) {
    const n = Number(limitRaw);
    if (!Number.isFinite(n) || n < 1 || n > 100) {
      return NextResponse.json(
        { error: "Invalid limit (must be 1-100)" },
        { status: 400 }
      );
    }
    limit = n;
  }

  try {
    const report = await getStockTradesByBioguide({ bioguide, limit });
    return NextResponse.json(report, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=600, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/stock-trades] failed", bioguide, msg);
    return NextResponse.json(
      { error: "Failed to load stock trades", detail: msg },
      { status: 500 }
    );
  }
}
