"use client";

import { useEffect, useState } from "react";
import type { Legislator } from "@/lib/data/legislators";
import type {
  OutsideSpendingSummary,
  OutsideSpendingEntry,
} from "@/lib/data/donors";

// Independent expenditure tracking. Shows Super PACs spending money to
// support OR oppose the legislator's candidacy this cycle — the
// "outside money" half of campaign finance that direct contributions
// (the donor bubble chart) miss entirely.

type State =
  | { status: "loading" }
  | { status: "ready"; report: OutsideSpendingSummary }
  | { status: "error"; message: string };

function formatDollars(n: number): string {
  if (n >= 1_000_000)
    return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return `$${n.toFixed(0)}`;
}

function CommitteeBar({
  entry,
  maxTotal,
  color,
}: {
  entry: OutsideSpendingEntry;
  maxTotal: number;
  color: string;
}) {
  const fillPct = maxTotal > 0 ? (entry.total / maxTotal) * 100 : 0;
  // FEC has a public committee page at fec.gov/data/committee/{id}
  const fecUrl = `https://www.fec.gov/data/committee/${entry.committeeId}/?cycle=2024`;
  return (
    <a
      href={fecUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        padding: "8px 10px",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 8,
        textDecoration: "none",
        color: "inherit",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background fill bar — sits behind the text, opacity-low */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${fillPct}%`,
          background: color,
          opacity: 0.15,
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "rgba(244,244,245,0.92)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {entry.committeeName}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 900,
            color,
            letterSpacing: -0.2,
            flexShrink: 0,
          }}
        >
          {formatDollars(entry.total)}
        </span>
      </div>
    </a>
  );
}

function SpendingColumn({
  title,
  emoji,
  entries,
  total,
  totalCommittees,
  color,
}: {
  title: string;
  emoji: string;
  entries: OutsideSpendingEntry[];
  total: number;
  totalCommittees: number;
  color: string;
}) {
  if (entries.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: "rgba(244,244,245,0.55)",
            }}
          >
            {title}
          </span>
        </div>
        <div
          style={{
            fontSize: 12,
            color: "rgba(244,244,245,0.45)",
            padding: "10px 12px",
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed rgba(255,255,255,0.08)",
            borderRadius: 8,
          }}
        >
          None on file for this cycle.
        </div>
      </div>
    );
  }

  const maxTotal = entries[0]?.total ?? 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: "rgba(244,244,245,0.55)",
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 900,
            color,
            letterSpacing: -0.3,
          }}
        >
          {formatDollars(total)}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {entries.map((e) => (
          <CommitteeBar
            key={e.committeeId}
            entry={e}
            maxTotal={maxTotal}
            color={color}
          />
        ))}
      </div>
      {totalCommittees > entries.length ? (
        <div
          style={{
            fontSize: 10,
            color: "rgba(244,244,245,0.4)",
            paddingLeft: 2,
          }}
        >
          Top {entries.length} of {totalCommittees} {emoji} committees shown.
        </div>
      ) : null}
    </div>
  );
}

export default function OutsideSpendingSection({ leg }: { leg: Legislator }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    if (leg.fecIds.length === 0) {
      setState({
        status: "error",
        message: "No FEC candidate IDs on file for this legislator.",
      });
      return;
    }
    setState({ status: "loading" });
    (async () => {
      try {
        const url = `/api/outside-spending/${leg.bioguide}?fec=${encodeURIComponent(leg.fecIds.join(","))}`;
        const res = await fetch(url);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({
            status: "error",
            message: body?.error || "Request failed",
          });
          return;
        }
        setState({
          status: "ready",
          report: body as OutsideSpendingSummary,
        });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setState({ status: "error", message: msg });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leg.bioguide, leg.fecIds]);

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
        Loading Super PAC outside spending from FEC…
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
        Could not load outside spending: {state.message}
      </div>
    );
  }

  const { topSupport, topOppose, totalSupport, totalOppose, cycle } =
    state.report;

  if (topSupport.length === 0 && topOppose.length === 0) {
    return (
      <div
        style={{
          padding: "12px 14px",
          background: "rgba(255,255,255,0.02)",
          border: "1px dashed rgba(255,255,255,0.08)",
          borderRadius: 10,
          fontSize: 12,
          color: "rgba(244,244,245,0.55)",
          lineHeight: 1.55,
        }}
      >
        No Super PAC independent expenditures on FEC for the {cycle} cycle.
        Usually means the legislator was not on the ballot this cycle.
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
        gap: 14,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          color: "rgba(244,244,245,0.5)",
          lineHeight: 1.5,
        }}
      >
        Super PAC independent expenditures for cycle{" "}
        <strong style={{ color: "#f4f4f5" }}>{cycle}</strong>, sourced from
        FEC Schedule E filings. This is money spent BY outside committees
        ON ads / mail / digital supporting or opposing this candidate — it
        never touches the candidate&apos;s own committee, so the donor bubble
        chart above does not include it.
      </div>

      <SpendingColumn
        title="Supporting"
        emoji="supporting"
        entries={topSupport}
        total={totalSupport}
        totalCommittees={state.report.supportCommitteeCount}
        color="#22c55e"
      />

      <SpendingColumn
        title="Opposing"
        emoji="opposing"
        entries={topOppose}
        total={totalOppose}
        totalCommittees={state.report.opposeCommitteeCount}
        color="#ef4444"
      />

      <div
        style={{
          fontSize: 10,
          color: "rgba(244,244,245,0.4)",
          lineHeight: 1.5,
        }}
      >
        Click any committee name to view its FEC filings page. Independent
        expenditures are not subject to the $5,000-per-cycle contribution
        cap that applies to direct PAC donations — Super PACs can spend
        unlimited amounts, but only on independent ads, not coordinated
        with the candidate.
      </div>
    </div>
  );
}
