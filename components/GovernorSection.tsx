"use client";

import { getGovernor, type GovernorParty } from "@/lib/data/governors";

// State governor / DC mayor card. Small section between the
// congressional delegation and the candidates / judges sections so
// voters see who runs the state executive in addition to the people
// they sent to Congress.

const PARTY_COLORS: Record<GovernorParty, string> = {
  D: "#3b82f6",
  R: "#ef4444",
  I: "#a855f7",
};

const PARTY_LABEL: Record<GovernorParty, string> = {
  D: "Democratic",
  R: "Republican",
  I: "Independent",
};

export default function GovernorSection({
  stateCode,
}: {
  stateCode: string;
}) {
  const g = getGovernor(stateCode);
  if (!g) {
    return (
      <div
        style={{
          padding: "10px 12px",
          background: "rgba(255,255,255,0.02)",
          border: "1px dashed rgba(255,255,255,0.08)",
          borderRadius: 8,
          fontSize: 12,
          color: "rgba(244,244,245,0.55)",
        }}
      >
        Governor information not yet available for this state.
      </div>
    );
  }

  const partyColor = PARTY_COLORS[g.party];
  const yearsServed = Math.max(0, new Date().getUTCFullYear() - g.termStartYear);
  const tenureText =
    yearsServed >= 1
      ? `${g.title} since ${g.termStartYear} (${yearsServed} ${
          yearsServed === 1 ? "yr" : "yrs"
        })`
      : `${g.title} since ${g.termStartYear}`;

  return (
    <a
      href={g.officialUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{
        display: "block",
        padding: "12px 14px",
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${partyColor}44`,
        borderLeft: `4px solid ${partyColor}`,
        borderRadius: 8,
        textDecoration: "none",
        color: "inherit",
        transition: "background 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${partyColor}10`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.025)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: 0.4,
            padding: "2px 6px",
            borderRadius: 4,
            background: `${partyColor}28`,
            color: partyColor,
            textTransform: "uppercase",
            flexShrink: 0,
          }}
          title={PARTY_LABEL[g.party]}
        >
          {g.party}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#f4f4f5",
          }}
        >
          {g.name}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "rgba(196,181,253,0.65)",
          }}
        >
          ↗
        </span>
      </div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(244,244,245,0.65)",
          marginBottom: 4,
          lineHeight: 1.4,
        }}
      >
        {tenureText}
      </div>
      <div
        style={{
          fontSize: 10.5,
          color: "rgba(244,244,245,0.5)",
        }}
      >
        Next election: {g.nextElectionYear}
        {g.termLimited ? " · Term-limited (cannot seek re-election)" : ""}
      </div>
    </a>
  );
}
