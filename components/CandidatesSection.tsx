"use client";

import { useEffect, useState } from "react";
import type {
  Candidate,
  CandidateParty,
  CandidatesReport,
} from "@/lib/data/candidates";

// Federal candidates running for office in a given state. Shown
// below the incumbent delegation in StateDetailPanel so voters can
// see who's challenging their representatives and who's running for
// open seats in the upcoming cycle.

type State =
  | { status: "loading" }
  | { status: "ready"; report: CandidatesReport }
  | { status: "error"; message: string };

const PARTY_COLORS: Record<CandidateParty, string> = {
  D: "#3b82f6",
  R: "#ef4444",
  I: "#a855f7",
  L: "#fbbf24",
  G: "#22c55e",
  Other: "#94a3b8",
};

function PartyChip({ c }: { c: Candidate }) {
  const color = PARTY_COLORS[c.party];
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: 0.4,
        padding: "2px 6px",
        borderRadius: 4,
        background: `${color}28`,
        color,
        textTransform: "uppercase",
        flexShrink: 0,
      }}
      title={c.partyLabel}
    >
      {c.party === "Other"
        ? c.partyLabel.slice(0, 3).toUpperCase()
        : c.party}
    </span>
  );
}

function RoleChip({ c }: { c: Candidate }) {
  if (c.challengeRole === "Open seat") {
    return (
      <span
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: 0.4,
          padding: "2px 6px",
          borderRadius: 4,
          background: "rgba(196,181,253,0.15)",
          color: "#c4b5fd",
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        Open seat
      </span>
    );
  }
  if (c.challengeRole === "Challenger") {
    return (
      <span
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: 0.4,
          padding: "2px 6px",
          borderRadius: 4,
          background: "rgba(251,191,36,0.15)",
          color: "#fbbf24",
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        Challenger
      </span>
    );
  }
  return null;
}

function CandidateRow({ c }: { c: Candidate }) {
  const districtLabel =
    c.office === "House"
      ? c.district === null
        ? "At-large"
        : `District ${c.district}`
      : "Senate seat";
  const fecUrl = `https://www.fec.gov/data/candidate/${encodeURIComponent(c.fecId)}/`;

  return (
    <div
      style={{
        padding: "8px 10px",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 8,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 3,
          }}
        >
          <PartyChip c={c} />
          <RoleChip c={c} />
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: "#f4f4f5",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {c.name}
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
          <span>{districtLabel}</span>
          <span>·</span>
          <span>{c.partyLabel}</span>
          {c.firstFiled ? (
            <>
              <span>·</span>
              <span>Filed {c.firstFiled}</span>
            </>
          ) : null}
          <span>·</span>
          <a
            href={fecUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              color: "rgba(196,181,253,0.85)",
              textDecoration: "underline",
            }}
          >
            FEC profile
          </a>
        </div>
      </div>
    </div>
  );
}

function SubsectionHeading({
  label,
  count,
}: {
  label: string;
  count: number;
}) {
  return (
    <div
      style={{
        fontSize: 10.5,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        color: "rgba(244,244,245,0.55)",
        padding: "2px 0 4px",
        display: "flex",
        gap: 8,
        alignItems: "baseline",
      }}
    >
      <span>{label}</span>
      <span style={{ color: "rgba(244,244,245,0.35)" }}>
        ({count})
      </span>
    </div>
  );
}

export default function CandidatesSection({ stateCode }: { stateCode: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch(`/api/candidates/${stateCode}`);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({
            status: "error",
            message: body?.error || "Request failed",
          });
          return;
        }
        setState({ status: "ready", report: body as CandidatesReport });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setState({ status: "error", message: msg });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stateCode]);

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
        Loading active federal candidates…
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
        Could not load candidates: {state.message}
      </div>
    );
  }

  const { cycle, senateCandidates, houseCandidates, total } = state.report;

  if (total === 0) {
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
        No challengers or open-seat candidates have raised funds with the
        FEC for the {cycle} cycle in this state yet. Filings update
        continuously as candidates register and report fundraising.
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
        gap: 12,
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
          {total} {total === 1 ? "candidate" : "candidates"} running ({cycle}{" "}
          cycle)
        </div>
      </div>

      <div
        style={{
          fontSize: 10.5,
          color: "rgba(244,244,245,0.5)",
          lineHeight: 1.55,
        }}
      >
        Federal candidates who have registered with the FEC and raised funds
        for the {cycle} election cycle. Incumbents already serving are listed
        above. Each row links to that candidate&rsquo;s public FEC profile.
      </div>

      {senateCandidates.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SubsectionHeading
            label="Senate"
            count={senateCandidates.length}
          />
          {senateCandidates.map((c) => (
            <CandidateRow key={c.fecId} c={c} />
          ))}
        </div>
      ) : null}

      {houseCandidates.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SubsectionHeading
            label="House"
            count={houseCandidates.length}
          />
          {houseCandidates.map((c) => (
            <CandidateRow key={c.fecId} c={c} />
          ))}
        </div>
      ) : null}

      <div
        style={{
          fontSize: 10,
          color: "rgba(244,244,245,0.4)",
          lineHeight: 1.5,
        }}
      >
        Source: Federal Election Commission api.open.fec.gov. Filtered to
        candidate_status=C (active registration) and has_raised_funds=true to
        suppress paper-only filings.
      </div>
    </div>
  );
}
