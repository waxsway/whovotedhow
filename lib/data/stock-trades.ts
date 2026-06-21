// Congressional stock trade tracking. Members of Congress are required by
// the STOCK Act to disclose their stock trades within 30-45 days. This is
// some of the most viral political-accountability content that exists —
// "did your senator buy chip stocks right before the CHIPS Act vote?"
//
// Data sources (community-maintained mirrors of efdsearch.senate.gov and
// disclosures-clerk.house.gov):
//   - Senate: github.com/timothycarambat/senate-stock-watcher-data
//   - House:  github.com/TattooedHead/house-stock-watcher-data
//
// Both are updated daily as new disclosures land. We fetch the aggregate
// JSON files server-side, cache in memory, and match each trade to a
// bioguide id via fuzzy name matching against our legislator roster.

import { fetchCurrentLegislators, type Legislator } from "./legislators";

const SENATE_URL =
  "https://raw.githubusercontent.com/timothycarambat/senate-stock-watcher-data/master/aggregate/all_transactions.json";
const HOUSE_URL =
  "https://raw.githubusercontent.com/TattooedHead/house-stock-watcher-data/main/data/all_transactions.json";

// ─── Raw upstream row shapes ────────────────────────────────────────────

type SenateRawTransaction = {
  transaction_date?: string; // "MM/DD/YYYY"
  owner?: string;
  ticker?: string;
  asset_description?: string;
  asset_type?: string;
  type?: string; // "Purchase", "Sale (Full)", "Sale (Partial)", "Exchange", etc.
  amount?: string; // dollar range like "$1,001 - $15,000"
  comment?: string;
  senator?: string;
  ptr_link?: string;
};

type HouseRawTransaction = {
  transaction_date?: string; // "MM/DD/YYYY"
  disclosure_date?: string;
  ticker?: string;
  asset_description?: string;
  asset_type?: string;
  type?: string; // "Purchase", "Sale", etc.
  amount?: string;
  amount_mid?: number; // House data includes the numeric midpoint already
  representative?: string;
  district?: string;
  owner?: string;
  filing_id?: string;
  source_url?: string;
};

// ─── Normalized shape we expose ─────────────────────────────────────────

export type TradeType =
  | "Purchase"
  | "Sale"
  | "Exchange"
  | "Other";

export type StockTrade = {
  // Bioguide id of the legislator who made the trade.
  bioguide: string;
  chamber: "Senate" | "House";
  transactionDate: string; // ISO YYYY-MM-DD
  ticker: string | null;
  assetDescription: string;
  assetType: string;
  type: TradeType;
  // The raw type string from the source (e.g. "Sale (Full)") so the UI can
  // surface details the simplified TradeType buckets away.
  rawType: string;
  amountRange: string; // raw range string
  amountMid: number | null; // dollar midpoint of the amount range
  owner: string; // "Self", "Spouse", "Joint", "Dependent", ...
  sourceUrl: string | null; // link to the official disclosure
};

// ─── Amount range parser ────────────────────────────────────────────────

const AMOUNT_MIDPOINTS: Array<{ pattern: RegExp; mid: number }> = [
  { pattern: /^\$1,001\s*-\s*\$15,000$/i, mid: 8000 },
  { pattern: /^\$15,001\s*-\s*\$50,000$/i, mid: 32500 },
  { pattern: /^\$50,001\s*-\s*\$100,000$/i, mid: 75000 },
  { pattern: /^\$100,001\s*-\s*\$250,000$/i, mid: 175000 },
  { pattern: /^\$250,001\s*-\s*\$500,000$/i, mid: 375000 },
  { pattern: /^\$500,001\s*-\s*\$1,000,000$/i, mid: 750000 },
  { pattern: /^\$1,000,001\s*-\s*\$5,000,000$/i, mid: 3000000 },
  { pattern: /^\$5,000,001\s*-\s*\$25,000,000$/i, mid: 15000000 },
  { pattern: /^\$25,000,001\s*-\s*\$50,000,000$/i, mid: 37500000 },
  { pattern: /^over\s*\$50,000,000$/i, mid: 50000000 },
];

function parseAmountRange(range: string | undefined): number | null {
  if (!range) return null;
  const cleaned = range.trim();
  if (!cleaned || /unknown/i.test(cleaned)) return null;
  for (const { pattern, mid } of AMOUNT_MIDPOINTS) {
    if (pattern.test(cleaned)) return mid;
  }
  return null;
}

// ─── Date parser ────────────────────────────────────────────────────────

function parseDate(s: string | undefined): string {
  if (!s) return "";
  const trimmed = s.trim();
  // Both sources use MM/DD/YYYY
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!match) return trimmed;
  const [, mm, dd, yyyy] = match;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

// ─── Trade type normalizer ──────────────────────────────────────────────

function normalizeTradeType(raw: string | undefined): TradeType {
  const s = (raw || "").trim().toLowerCase();
  if (s.startsWith("purchase")) return "Purchase";
  if (s.startsWith("sale")) return "Sale";
  if (s.startsWith("exchange")) return "Exchange";
  return "Other";
}

// ─── Name matching: legislator name → bioguide ──────────────────────────
//
// Senate file: "Ron L Wyden", "Patrick J Toomey", "Bernard Sanders"
// House file: "Matthew Robert Van Epps", "Nancy Pelosi", "Marjorie Taylor Greene"
// Bioguide roster: "Ron Wyden", "Patrick J. Toomey", "Bernard Sanders"
//
// Strategy: build multiple keys per legislator and match against them.

function normalizeNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lastFirstKey(fullName: string): string {
  const parts = fullName
    .toLowerCase()
    .replace(/[.,]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return parts.join(" ");
  const last = parts[parts.length - 1];
  const first = parts[0];
  return `${last}|${first}`;
}

function lastInitialKey(fullName: string): string {
  const parts = fullName
    .toLowerCase()
    .replace(/[.,]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return parts.join(" ");
  const last = parts[parts.length - 1];
  const first = parts[0];
  return `${last}|${first.charAt(0)}`;
}

type NameIndex = {
  exact: Map<string, string>; // normalized full name → bioguide
  lastFirst: Map<string, string>; // last|first → bioguide
  lastInitial: Map<string, string>; // last|first-initial → bioguide
};

function buildNameIndex(legislators: Legislator[]): NameIndex {
  const exact = new Map<string, string>();
  const lastFirst = new Map<string, string>();
  const lastInitial = new Map<string, string>();
  for (const leg of legislators) {
    const names = [leg.fullName, `${leg.firstName} ${leg.lastName}`];
    for (const n of names) {
      if (!n) continue;
      const k1 = normalizeNameKey(n);
      if (k1 && !exact.has(k1)) exact.set(k1, leg.bioguide);
      const k2 = lastFirstKey(n);
      if (k2 && !lastFirst.has(k2)) lastFirst.set(k2, leg.bioguide);
      const k3 = lastInitialKey(n);
      if (k3 && !lastInitial.has(k3)) lastInitial.set(k3, leg.bioguide);
    }
  }
  return { exact, lastFirst, lastInitial };
}

function matchNameToBioguide(
  rawName: string,
  idx: NameIndex
): string | null {
  if (!rawName) return null;
  const k1 = normalizeNameKey(rawName);
  const hit1 = idx.exact.get(k1);
  if (hit1) return hit1;
  const k2 = lastFirstKey(rawName);
  const hit2 = idx.lastFirst.get(k2);
  if (hit2) return hit2;
  const k3 = lastInitialKey(rawName);
  const hit3 = idx.lastInitial.get(k3);
  if (hit3) return hit3;
  return null;
}

// ─── Per-chamber cache ──────────────────────────────────────────────────
//
// Earlier versions loaded both Senate (3MB) and House (11MB) JSONs on
// every cold cache build. That's a 14MB cold-start cost when a single
// senator is requested — enough to push close to Vercel's serverless
// function timeout under traffic spikes. We now load chambers lazily:
// only when a request for that chamber's first member arrives. Process
// instances that only ever see senator requests never pay for the
// 11MB House data.

type ChamberCache = {
  byBioguide: Map<string, StockTrade[]>;
};

let senateCachePromise: Promise<ChamberCache> | null = null;
let houseCachePromise: Promise<ChamberCache> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    next: { revalidate: 60 * 60 * 24 }, // 24h cache via Next route layer
  });
  if (!res.ok) {
    throw new Error(`Stock trades fetch ${url} failed: HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

async function loadSenateCache(): Promise<ChamberCache> {
  if (!senateCachePromise) {
    senateCachePromise = (async () => {
      const [legislators, senateRaw] = await Promise.all([
        fetchCurrentLegislators(),
        fetchJson<SenateRawTransaction[]>(SENATE_URL),
      ]);
      const idx = buildNameIndex(legislators);
      const byBioguide = new Map<string, StockTrade[]>();

      for (const row of senateRaw) {
        const name = row.senator;
        if (!name) continue;
        const bioguide = matchNameToBioguide(name, idx);
        if (!bioguide) continue;
        const trade: StockTrade = {
          bioguide,
          chamber: "Senate",
          transactionDate: parseDate(row.transaction_date),
          ticker:
            row.ticker && row.ticker !== "N/A" && row.ticker !== "--"
              ? row.ticker
              : null,
          assetDescription: (row.asset_description || "").trim(),
          assetType: (row.asset_type || "").trim(),
          type: normalizeTradeType(row.type),
          rawType: (row.type || "").trim(),
          amountRange: (row.amount || "").trim(),
          amountMid: parseAmountRange(row.amount),
          owner: (row.owner || "").trim() || "Self",
          sourceUrl: row.ptr_link ?? null,
        };
        const bucket = byBioguide.get(bioguide);
        if (bucket) bucket.push(trade);
        else byBioguide.set(bioguide, [trade]);
      }

      for (const trades of byBioguide.values()) {
        trades.sort((a, b) =>
          a.transactionDate < b.transactionDate ? 1 : -1
        );
      }

      return { byBioguide };
    })().catch((err) => {
      senateCachePromise = null;
      throw err;
    });
  }
  return senateCachePromise;
}

async function loadHouseCache(): Promise<ChamberCache> {
  if (!houseCachePromise) {
    houseCachePromise = (async () => {
      const [legislators, houseRaw] = await Promise.all([
        fetchCurrentLegislators(),
        fetchJson<HouseRawTransaction[]>(HOUSE_URL),
      ]);
      const idx = buildNameIndex(legislators);
      const byBioguide = new Map<string, StockTrade[]>();

      for (const row of houseRaw) {
        const name = row.representative;
        if (!name) continue;
        const bioguide = matchNameToBioguide(name, idx);
        if (!bioguide) continue;
        const cleanedDesc = (row.asset_description || "")
          .replace(/[\x00-\x1f]/g, "")
          .trim();
        const trade: StockTrade = {
          bioguide,
          chamber: "House",
          transactionDate: parseDate(row.transaction_date),
          ticker:
            row.ticker && row.ticker !== "N/A" && row.ticker !== "--"
              ? row.ticker
              : null,
          assetDescription: cleanedDesc,
          assetType: (row.asset_type || "").trim(),
          type: normalizeTradeType(row.type),
          rawType: (row.type || "").trim(),
          amountRange: (row.amount || "").trim(),
          amountMid:
            typeof row.amount_mid === "number" && Number.isFinite(row.amount_mid)
              ? row.amount_mid
              : parseAmountRange(row.amount),
          owner: (row.owner || "").trim() || "Self",
          sourceUrl: row.source_url ?? null,
        };
        const bucket = byBioguide.get(bioguide);
        if (bucket) bucket.push(trade);
        else byBioguide.set(bioguide, [trade]);
      }

      for (const trades of byBioguide.values()) {
        trades.sort((a, b) =>
          a.transactionDate < b.transactionDate ? 1 : -1
        );
      }

      return { byBioguide };
    })().catch((err) => {
      houseCachePromise = null;
      throw err;
    });
  }
  return houseCachePromise;
}

// ─── Public API ─────────────────────────────────────────────────────────

export type StockTradesReport = {
  bioguide: string;
  // Which chamber the legislator sits in (null when bioguide unknown).
  // Drives UI labeling: "House STOCK Act disclosures" vs the senate
  // "data temporarily unavailable" empty state.
  chamber: "House" | "Senate" | null;
  // True when we know we don't have current data for this chamber and
  // are intentionally returning empty rather than misrepresenting an
  // empty result as "no trades on file". Currently set for all senators
  // until we ship a direct efdsearch.senate.gov scraper.
  sourceUnavailable: boolean;
  totalTrades: number;
  totalEstimatedVolume: number; // sum of amount midpoints (where known)
  purchaseCount: number;
  saleCount: number;
  recentTrades: StockTrade[];
};

const DEFAULT_DISPLAY_LIMIT = 20;

// We need to know which chamber a bioguide belongs to BEFORE deciding
// which stock-data file to load. The roster is small (~1MB, already
// fetched and cached by the legislators module) so this is cheap.
async function chamberForBioguide(
  bioguide: string
): Promise<"Senate" | "House" | null> {
  const list = await fetchCurrentLegislators();
  const found = list.find((l) => l.bioguide === bioguide);
  return found?.chamber ?? null;
}

export async function getStockTradesByBioguide(opts: {
  bioguide: string;
  limit?: number;
}): Promise<StockTradesReport> {
  const limit = opts.limit ?? DEFAULT_DISPLAY_LIMIT;
  const chamber = await chamberForBioguide(opts.bioguide);
  // Unknown bioguide: surface an empty report rather than 500'ing.
  if (!chamber) {
    return {
      bioguide: opts.bioguide,
      chamber: null,
      sourceUnavailable: false,
      totalTrades: 0,
      totalEstimatedVolume: 0,
      purchaseCount: 0,
      saleCount: 0,
      recentTrades: [],
    };
  }
  // The Senate aggregator we used to mirror
  // (github.com/timothycarambat/senate-stock-watcher-data) stopped updating
  // in March 2021. Even fixing name-matching against the stale set is
  // misleading: senators sworn in after 2021 (Tuberville, Vance, Britt,
  // etc.) can't appear in it at all, and the 2021 snapshot for senators
  // who were there earlier doesn't reflect the last 4+ years of trades.
  // Until we ship a direct efdsearch.senate.gov scraper, return an
  // explicit "data unavailable" report for senators so the UI can show
  // a real explanation instead of an inaccurate "no trades on file".
  if (chamber === "Senate") {
    return {
      bioguide: opts.bioguide,
      chamber: "Senate",
      sourceUnavailable: true,
      totalTrades: 0,
      totalEstimatedVolume: 0,
      purchaseCount: 0,
      saleCount: 0,
      recentTrades: [],
    };
  }
  const cache = await loadHouseCache();
  const trades = cache.byBioguide.get(opts.bioguide) ?? [];

  let totalEstimatedVolume = 0;
  let purchaseCount = 0;
  let saleCount = 0;
  for (const t of trades) {
    if (t.amountMid !== null) totalEstimatedVolume += t.amountMid;
    if (t.type === "Purchase") purchaseCount += 1;
    else if (t.type === "Sale") saleCount += 1;
  }

  return {
    bioguide: opts.bioguide,
    chamber: "House",
    sourceUnavailable: false,
    totalTrades: trades.length,
    totalEstimatedVolume: Math.round(totalEstimatedVolume),
    purchaseCount,
    saleCount,
    recentTrades: trades.slice(0, limit),
  };
}
