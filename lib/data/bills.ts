// Legislation sponsored by each member of Congress. The voting record
// shows how members REACT to legislation that hits the floor; sponsorship
// shows what they ACTIVELY push for. Both matter for accountability.
// A senator who votes "no" on weak gun-safety bills but never introduces
// a stronger one of their own is doing something different than one who
// introduces serious legislation and watches it die in committee.
//
// Data source: api.congress.gov — the official Library of Congress
// public API. Free, requires a key. We accept CONGRESS_API_KEY from
// the environment and fall back to DEMO_KEY (rate-limited to 1000
// requests/day per IP) so the feature works out of the box and can
// be upgraded to unrestricted by registering at api.congress.gov/sign-up.
//
// Endpoint: GET /v3/member/{bioguide}/sponsored-legislation
//   Returns a paginated array of both bills (with number+type) and
//   amendments (with amendmentNumber). We filter to bills only —
//   amendments are noisy at this level of abstraction and the
//   accountability signal is clearer with primary legislation.

const CONGRESS_BASE = "https://api.congress.gov/v3";

function getCongressApiKey(): string {
  // Use the user's CONGRESS_API_KEY if set (unlimited free key from
  // api.congress.gov/sign-up/), otherwise fall back to the DEMO_KEY
  // which works for low-volume traffic.
  return process.env.CONGRESS_API_KEY?.trim() || "DEMO_KEY";
}

// ─── Raw upstream shapes ────────────────────────────────────────────────

type LatestAction = {
  actionDate?: string;
  text?: string;
};

type PolicyArea = {
  name?: string | null;
};

// The sponsoredLegislation array contains either Bills or Amendments.
// We distinguish by the presence of `amendmentNumber` (amendment) vs
// `number` + `type` (bill).
type RawSponsoredItem = {
  congress?: number;
  introducedDate?: string;
  latestAction?: LatestAction;
  number?: string;
  type?: string | null;
  title?: string;
  policyArea?: PolicyArea;
  url?: string;
  amendmentNumber?: string;
};

type SponsoredResponse = {
  pagination?: {
    count?: number;
    next?: string | null;
  };
  sponsoredLegislation?: RawSponsoredItem[];
};

// ─── Normalized shape we expose ─────────────────────────────────────────

export type SponsoredBill = {
  congress: number;
  type: string; // "HR", "S", "HJRES", etc.
  number: string; // "4825", "1234"
  title: string;
  introducedDate: string; // ISO YYYY-MM-DD
  latestActionDate: string | null;
  latestActionText: string | null;
  policyArea: string | null; // e.g. "Health", "Taxation", "Crime and Law Enforcement"
  congressGovUrl: string; // public congress.gov page
};

export type SponsoredBillsReport = {
  bioguide: string;
  totalSponsored: number; // count of bills (excludes amendments)
  recentBills: SponsoredBill[];
};

// ─── Bill type → public URL slug ────────────────────────────────────────

const BILL_TYPE_TO_SLUG: Record<string, string> = {
  HR: "house-bill",
  S: "senate-bill",
  HJRES: "house-joint-resolution",
  SJRES: "senate-joint-resolution",
  HCONRES: "house-concurrent-resolution",
  SCONRES: "senate-concurrent-resolution",
  HRES: "house-resolution",
  SRES: "senate-resolution",
};

function buildCongressGovUrl(
  congress: number,
  type: string,
  number: string
): string {
  const ord = ordinal(congress);
  const slug = BILL_TYPE_TO_SLUG[type.toUpperCase()] || "bill";
  return `https://www.congress.gov/bill/${ord}-congress/${slug}/${number}`;
}

function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (k >= 11 && k <= 13) return `${n}th`;
  if (j === 1) return `${n}st`;
  if (j === 2) return `${n}nd`;
  if (j === 3) return `${n}rd`;
  return `${n}th`;
}

// ─── Cache (per bioguide, lazy) ─────────────────────────────────────────

type BillsCacheEntry = {
  report: SponsoredBillsReport;
  fetchedAt: number;
};

const billsCache = new Map<string, Promise<BillsCacheEntry>>();

async function fetchSponsoredBills(
  bioguide: string,
  limit: number
): Promise<SponsoredBillsReport> {
  const apiKey = getCongressApiKey();
  // Fetch enough rows to ensure we get `limit` bills even if a bunch
  // of the initial items are amendments. Doubling the limit and
  // capping at 50 keeps the request bounded.
  const fetchLimit = Math.min(50, Math.max(limit * 2, 20));
  const url = new URL(
    `${CONGRESS_BASE}/member/${encodeURIComponent(bioguide)}/sponsored-legislation`
  );
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(fetchLimit));

  const res = await fetch(url.toString(), {
    next: { revalidate: 86400 }, // 24h: bills don't churn rapidly per member
  });
  if (!res.ok) {
    throw new Error(
      `Congress.gov sponsored-legislation fetch failed: HTTP ${res.status}`
    );
  }
  const body = (await res.json()) as SponsoredResponse;
  const items = body.sponsoredLegislation ?? [];

  const bills: SponsoredBill[] = [];
  for (const item of items) {
    // Skip amendments: amendmentNumber present and no `number` + valid `type`
    if (item.amendmentNumber || !item.type || !item.number) continue;
    if (typeof item.congress !== "number") continue;
    bills.push({
      congress: item.congress,
      type: item.type.toUpperCase(),
      number: item.number,
      title: (item.title || "").trim() || "(untitled bill)",
      introducedDate: (item.introducedDate || "").trim(),
      latestActionDate: item.latestAction?.actionDate?.trim() || null,
      latestActionText: item.latestAction?.text?.trim() || null,
      policyArea: item.policyArea?.name?.trim() || null,
      congressGovUrl: buildCongressGovUrl(
        item.congress,
        item.type,
        item.number
      ),
    });
    if (bills.length >= limit) break;
  }

  // The pagination.count field is the TOTAL items including amendments,
  // not the count of bills specifically. We surface what we can derive:
  // the bills we kept, plus the upstream total for context.
  const upstreamTotal = body.pagination?.count ?? bills.length;

  return {
    bioguide,
    totalSponsored: upstreamTotal,
    recentBills: bills,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────

export async function getSponsoredBillsByBioguide(opts: {
  bioguide: string;
  limit?: number;
}): Promise<SponsoredBillsReport> {
  const limit = opts.limit ?? 10;
  const cacheKey = `${opts.bioguide}|${limit}`;
  let pending = billsCache.get(cacheKey);
  if (!pending) {
    pending = (async () => {
      try {
        const report = await fetchSponsoredBills(opts.bioguide, limit);
        return { report, fetchedAt: Date.now() };
      } catch (err) {
        billsCache.delete(cacheKey);
        throw err;
      }
    })();
    billsCache.set(cacheKey, pending);
  }
  const entry = await pending;
  return entry.report;
}
