"use client";

import { useEffect, useState } from "react";
import type {
  SponsoredBill,
  SponsoredBillsReport,
} from "@/lib/data/bills";

// Bills sponsored by this legislator. The complement to the voting
// record — what they actively introduce, not just how they vote on
// what others introduce.

type State =
  | { status: "loading" }
  | { status: "ready"; report: SponsoredBillsReport }
  | { status: "error"; message: string };

function formatDate(iso: string | null): string {
  if (!iso || iso.length < 10) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function billTypeLabel(type: string): string {
  const t = type.toUpperCase();
  if (t === "HR") return "H.R.";
  if (t === "S") return "S.";
  if (t === "HJRES") return "H.J.Res.";
  if (t === "SJRES") return "S.J.Res.";
  if (t === "HCONRES") return "H.Con.Res.";
  if (t === "SCONRES") return "S.Con.Res.";
  if (t === "HRES") return "H.Res.";
  if (t === "SRES") return "S.Res.";
  return t;
}

function BillRow({ b }: { b: SponsoredBill }) {
  return (
    <a
      href={b.congressGovUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{
        display: "block",
        padding: "9px 10px",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 8,
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(196,181,253,0.35)";
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
        e.currentTarget.style.background = "rgba(255,255,255,0.025)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          marginBottom: 4,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            fontSize: 10.5,
            fontWeight: 700,
            color: "rgba(196,181,253,0.85)",
            letterSpacing: 0.4,
            padding: "2px 6px",
            background: "rgba(196,181,253,0.12)",
            borderRadius: 4,
            flexShrink: 0,
          }}
        >
          {billTypeLabel(b.type)} {b.number}
        </span>
        {b.policyArea ? (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(244,244,245,0.55)",
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {b.policyArea}
          </span>
        ) : null}
        <span
          style={{
            fontSize: 10,
            color: "rgba(244,244,245,0.45)",
            marginLeft: "auto",
          }}
        >
          Introduced {formatDate(b.introducedDate)}
        </span>
      </div>
      <div
        style={{
          fontSize: 12,
          color: "#f4f4f5",
          lineHeight: 1.5,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          marginBottom: 4,
        }}
      >
        {b.title}
      </div>
      {b.latestActionText ? (
        <div
          style={{
            fontSize: 10.5,
            color: "rgba(244,244,245,0.5)",
            lineHeight: 1.45,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          Latest action ({formatDate(b.latestActionDate)}): {b.latestActionText}
        </div>
      ) : null}
    </a>
  );
}

export default function BillsSection({ bioguide }: { bioguide: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch(`/api/bills/${bioguide}?limit=10`);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({
            status: "error",
            message: body?.error || "Request failed",
          });
          return;
        }
        setState({ status: "ready", report: body as SponsoredBillsReport });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setState({ status: "error", message: msg });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bioguide]);

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
        Loading sponsored legislation…
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
        Could not load sponsored bills: {state.message}
      </div>
    );
  }

  const { totalSponsored, recentBills } = state.report;

  if (recentBills.length === 0) {
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
        No primary legislation sponsored yet (in the current Congress, or
        not yet propagated from the Library of Congress).
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
          Sponsored legislation
        </div>
        <div
          style={{
            fontSize: 11,
            color: "rgba(244,244,245,0.6)",
          }}
        >
          {totalSponsored.toLocaleString()} bills + amendments total
        </div>
      </div>

      <div
        style={{
          fontSize: 10.5,
          color: "rgba(244,244,245,0.5)",
          lineHeight: 1.55,
        }}
      >
        Most recent {recentBills.length} bills introduced by this member.
        Amendments excluded for clarity. Click any row to read the bill on
        congress.gov.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {recentBills.map((b) => (
          <BillRow key={`${b.congress}-${b.type}-${b.number}`} b={b} />
        ))}
      </div>

      <div
        style={{
          fontSize: 10,
          color: "rgba(244,244,245,0.4)",
          lineHeight: 1.5,
        }}
      >
        Source: api.congress.gov (Library of Congress). Latest-action text
        comes directly from the official bill record.
      </div>
    </div>
  );
}
