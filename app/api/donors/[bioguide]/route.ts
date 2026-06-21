import { NextResponse } from "next/server";
import { getTopDonorsByBioguide } from "@/lib/data/donors";

// Returns top employer-aggregated donors to a legislator's principal
// campaign committee for the requested cycle, sourced from FEC.gov.
//
// Query parameters:
//   ?fec=S6IL00151,H2IL20026   (comma-separated; required — FEC candidate IDs
//                                from the legislators YAML, ordered by the
//                                client so the chamber matching the current
//                                seat is first)
//   ?cycle=2024                 (optional; defaults to current presidential
//                                cycle if omitted)
//
// We pass FEC IDs in the query rather than re-loading the 1MB legislators
// YAML server-side on every donor lookup. The client already has the data;
// just forward the relevant fields.

export const runtime = "nodejs";
export const revalidate = 3600;

const BIOGUIDE_RE = /^[A-Z][0-9]{6}$/;
const FEC_ID_RE = /^[HSP][0-9A-Z]{8}$/;

// Default to the most recent even-year cycle. We use even years because FEC
// data is bucketed by two-year transaction periods (cycle 2024 = 2023+2024
// activity).
function defaultCycle(): number {
  const y = new Date().getUTCFullYear();
  return y % 2 === 0 ? y : y - 1;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ bioguide: string }> }
) {
  const { bioguide } = await params;

  if (!bioguide || !BIOGUIDE_RE.test(bioguide)) {
    return NextResponse.json({ error: "Invalid bioguide id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const fecParam = (searchParams.get("fec") ?? "").trim();
  if (!fecParam) {
    return NextResponse.json(
      { error: "Missing fec= query parameter (comma-separated FEC IDs)" },
      { status: 400 }
    );
  }
  const fecIds = fecParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => FEC_ID_RE.test(s));
  if (fecIds.length === 0) {
    return NextResponse.json(
      { error: "No valid FEC IDs in fec= query parameter" },
      { status: 400 }
    );
  }

  const cycleRaw = searchParams.get("cycle");
  let cycle = defaultCycle();
  if (cycleRaw) {
    const n = Number(cycleRaw);
    if (!Number.isFinite(n) || n < 1980 || n > 2100) {
      return NextResponse.json(
        { error: "Invalid cycle (must be an even election year between 1980 and 2100)" },
        { status: 400 }
      );
    }
    cycle = n;
  }

  try {
    const report = await getTopDonorsByBioguide({ bioguide, fecIds, cycle });
    return NextResponse.json(report, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=600, s-maxage=43200, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/donors] failed", bioguide, msg);
    return NextResponse.json(
      { error: "Failed to load donors", detail: msg },
      { status: 500 }
    );
  }
}
