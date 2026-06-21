"use client";

import { useEffect, useState } from "react";
import type { Legislator } from "@/lib/data/legislators";
import type { StockTrade, StockTradesReport } from "@/lib/data/stock-trades";

// Congressional stock trade display. Disclosed transactions in date-desc
// order with ticker, type (Purchase / Sale), amount range, and a link to
// the actual STOCK Act disclosure PDF.

type State =
  | { status: "loading" }
  | { status: "ready"; report: StockTradesReport }
  | { status: "error"; message: string };

function formatDollarsShort(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `$${m >= 10 ? m.toFixed(1) : m.toFixed(2)}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `$${k >= 100 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return `$${n}`;
}

function formatDate(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function TradeRow({ t }: { t: StockTrade }) {
  const typeColor =
    t.type === "Purchase"
      ? "#22c55e"
      : t.type === "Sale"
        ? "#ef4444"
        : "#a3a3a3";
  const typeBg =
    t.type === "Purchase"
      ? "rgba(34,197,94,0.18)"
      : t.type === "Sale"
        ? "rgba(239,68,68,0.18)"
        : "rgba(163,163,163,0.18)";

  return (
    <div
      style={{
        padding: "9px 10px",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 8,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 800,
          letterSpacing: 0.4,
          padding: "3px 6px",
          borderRadius: 5,
          background: typeBg,
          color: typeColor,
          textTransform: "uppercase",
          flexShrink: 0,
          minWidth: 56,
          textAlign: "center",
          marginTop: 1,
        }}
      >
        {t.type === "Purchase" ? "BUY" : t.type === "Sale" ? "SELL" : "OTHER"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 4,
          }}
        >
          {t.ticker ? (
            <span
              style={{
                fontFamily:
                  "var(--font-geist-mono), ui-monospace, monospace",
                fontSize: 13,
                fontWeight: 800,
                color: "#f4f4f5",
                letterSpacing: 0.3,
              }}
            >
              {t.ticker}
            </span>
          ) : null}
          <span
            style={{
              fontSize: 12,
              color: "rgba(244,244,245,0.78)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              minWidth: 0,
            }}
          >
            {t.assetDescription}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            fontSize: 10.5,
            color: "rgba(244,244,245,0.55)",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 700, color: "rgba(244,244,245,0.75)" }}>
            {t.amountRange || "Amount unknown"}
          </span>
          <span>·</span>
          <span>{formatDate(t.transactionDate)}</span>
          <span>·</span>
          <span>Owner: {t.owner}</span>
          {t.sourceUrl ? (
            <>
              <span>·</span>
              <a
                href={t.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  color: "rgba(196,181,253,0.85)",
                  textDecoration: "underline",
                }}
              >
                disclosure
              </a>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function StockTradesSection({ leg }: { leg: Legislator }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch(`/api/stock-trades/${leg.bioguide}?limit=20`);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({
            status: "error",
            message: body?.error || "Request failed",
          });
          return;
        }
        setState({ status: "ready", report: body as StockTradesReport });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setState({ status: "error", message: msg });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leg.bioguide]);

  if (state.status === "loading") {
    return (
      <div
        style={{
          fontSize: 12,
          color: "rgba(244,244,245,0.45)",
          padding: "8px 12px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 8,
        }}
      >
        Loading STOCK Act disclosures…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        style={{
          fontSize: 12,
          color: "rgba(244,244,245,0.45)",
          padding: "8px 12px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 8,
        }}
      >
        Could not load stock trades: {state.message}
      </div>
    );
  }

  const {
    totalTrades,
    totalEstimatedVolume,
    purchaseCount,
    saleCount,
    recentTrades,
  } = state.report;

  if (totalTrades === 0) {
    return (
      <div
        style={{
          padding: "10px 12px",
          background: "rgba(255,255,255,0.02)",
          border: "1px dashed rgba(255,255,255,0.08)",
          borderRadius: 8,
          fontSize: 12,
          color: "rgba(244,244,245,0.55)",
          lineHeight: 1.55,
        }}
      >
        No disclosed stock trades on file. Either this legislator (or their
        immediate household) has not traded individual securities during
        their service, or filings have not yet propagated to the public
        aggregators we mirror.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "12px 12px 14px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5" }}>
          {totalTrades.toLocaleString()} disclosed{" "}
          {totalTrades === 1 ? "trade" : "trades"}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "rgba(244,244,245,0.65)",
          }}
        >
          ~{formatDollarsShort(totalEstimatedVolume)} estimated volume ·{" "}
          <span style={{ color: "#22c55e" }}>{purchaseCount} buys</span> ·{" "}
          <span style={{ color: "#ef4444" }}>{saleCount} sells</span>
        </div>
      </div>

      <div
        style={{
          fontSize: 10.5,
          color: "rgba(244,244,245,0.5)",
          lineHeight: 1.55,
        }}
      >
        Most recent {recentTrades.length} of {totalTrades.toLocaleString()}{" "}
        disclosed trades shown. STOCK Act requires members to disclose trades
        within 30-45 days. Estimated volume uses the midpoint of the
        amount range each transaction was disclosed in.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {recentTrades.map((t, i) => (
          <TradeRow key={`${t.bioguide}-${t.transactionDate}-${i}`} t={t} />
        ))}
      </div>

      <div
        style={{
          fontSize: 10,
          color: "rgba(244,244,245,0.4)",
          lineHeight: 1.5,
        }}
      >
        Source: community-maintained mirrors of efdsearch.senate.gov (Senate)
        and disclosures-clerk.house.gov (House). Each &ldquo;disclosure&rdquo;
        link points to the actual filing.
      </div>
    </div>
  );
}
