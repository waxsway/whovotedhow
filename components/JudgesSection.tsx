"use client";

import { useEffect, useState } from "react";
import type {
  Judge,
  JudgeAppointingParty,
  JudgesReport,
} from "@/lib/data/judges";

// Federal Article III judges associated with a given state — district
// court judges sitting in that state, circuit court judges whose
// circuit covers that state, and Supreme Court justices (shown as a
// national group at the bottom).

type State =
  | { status: "loading" }
  | { status: "ready"; report: JudgesReport }
  | { status: "error"; message: string };

const PARTY_COLORS: Record<JudgeAppointingParty, string> = {
  Democratic: "#3b82f6",
  Republican: "#ef4444",
  Federalist: "#94a3b8",
  Whig: "#94a3b8",
  Other: "#94a3b8",
};

function formatYear(iso: string | null): string {
  if (!iso || iso.length < 4) return "—";
  return iso.slice(0, 4);
}

function PartyChip({ j }: { j: Judge }) {
  const color = PARTY_COLORS[j.appointingParty];
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
      title={`Appointed by a ${j.appointingPartyLabel} president`}
    >
      {j.appointingParty === "Democratic"
        ? "D"
        : j.appointingParty === "Republican"
          ? "R"
          : j.appointingPartyLabel.slice(0, 3).toUpperCase()}
    </span>
  );
}

function StatusChip({ j }: { j: Judge }) {
  if (j.status !== "Senior") return null;
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
      title="On senior status — reduced caseload but still hears cases"
    >
      Senior
    </span>
  );
}

function JudgeRow({ j }: { j: Judge }) {
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
          <PartyChip j={j} />
          <StatusChip j={j} />
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
            {j.fullName}
          </span>
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: "rgba(244,244,245,0.55)",
            lineHeight: 1.5,
            marginBottom: 2,
          }}
        >
          {j.appointmentTitle} · {j.courtName}
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
          <span>
            Appointed by{" "}
            <strong style={{ color: "rgba(244,244,245,0.78)" }}>
              {j.appointingPresident}
            </strong>
          </span>
          <span>·</span>
          <span>Commissioned {formatYear(j.commissionDate)}</span>
          {j.seniorStatusDate ? (
            <>
              <span>·</span>
              <span>Senior {formatYear(j.seniorStatusDate)}</span>
            </>
          ) : null}
          {j.abaRating ? (
            <>
              <span>·</span>
              <span>ABA: {j.abaRating}</span>
            </>
          ) : null}
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
      <span style={{ color: "rgba(244,244,245,0.35)" }}>({count})</span>
    </div>
  );
}

export default function JudgesSection({ stateCode }: { stateCode: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch(`/api/judges/${stateCode}`);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({
            status: "error",
            message: body?.error || "Request failed",
          });
          return;
        }
        setState({ status: "ready", report: body as JudgesReport });
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
        Loading federal judges…
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
        Could not load judges: {state.message}
      </div>
    );
  }

  const { districtJudges, circuitJudges, supremeJustices } = state.report;
  const total =
    districtJudges.length + circuitJudges.length + supremeJustices.length;

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
        No currently-serving federal judges on file for this state.
      </div>
    );
  }

  // Tally of D vs R appointees for a quick partisan snapshot of the
  // state-relevant federal judiciary (district + circuit; SCOTUS is
  // national and excluded from this header tally).
  const partisanRelevant = [...districtJudges, ...circuitJudges];
  const dCount = partisanRelevant.filter(
    (j) => j.appointingParty === "Democratic"
  ).length;
  const rCount = partisanRelevant.filter(
    (j) => j.appointingParty === "Republican"
  ).length;

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
          {partisanRelevant.length} federal{" "}
          {partisanRelevant.length === 1 ? "judge" : "judges"} for this state
        </div>
        {partisanRelevant.length > 0 ? (
          <div
            style={{
              fontSize: 11,
              color: "rgba(244,244,245,0.65)",
            }}
          >
            <span style={{ color: "#3b82f6" }}>{dCount} D-appointed</span>
            {" · "}
            <span style={{ color: "#ef4444" }}>{rCount} R-appointed</span>
          </div>
        ) : null}
      </div>

      <div
        style={{
          fontSize: 10.5,
          color: "rgba(244,244,245,0.5)",
          lineHeight: 1.55,
        }}
      >
        Article III judges currently serving — district court judges sitting
        in this state, circuit court judges whose circuit hears appeals from
        this state, and the U.S. Supreme Court. Party reflects the
        appointing president, not the judge&rsquo;s personal affiliation.
      </div>

      {circuitJudges.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SubsectionHeading
            label="U.S. Court of Appeals (Circuit)"
            count={circuitJudges.length}
          />
          {circuitJudges.map((j) => (
            <JudgeRow key={j.nid} j={j} />
          ))}
        </div>
      ) : null}

      {districtJudges.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SubsectionHeading
            label="U.S. District Court"
            count={districtJudges.length}
          />
          {districtJudges.map((j) => (
            <JudgeRow key={j.nid} j={j} />
          ))}
        </div>
      ) : null}

      {supremeJustices.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SubsectionHeading
            label="U.S. Supreme Court (national)"
            count={supremeJustices.length}
          />
          {supremeJustices.map((j) => (
            <JudgeRow key={j.nid} j={j} />
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
        Source: Federal Judicial Center, federal-judicial-service.csv.
        Includes only Article III judges (district, circuit, Supreme) with
        no termination on file.
      </div>
    </div>
  );
}
