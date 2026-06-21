"use client";

import { useEffect, useState } from "react";
import type {
  CommitteeAssignment,
  CommitteeAssignmentRole,
  CommitteesReport,
} from "@/lib/data/committees";

// Committee assignments per legislator. Surfaces:
//   - Full committee memberships, chairs/ranking members highlighted
//   - Subcommittee memberships, indented under their parent committee
//   - Leadership roles get prominent visual treatment

type State =
  | { status: "loading" }
  | { status: "ready"; report: CommitteesReport }
  | { status: "error"; message: string };

function RoleChip({ role }: { role: CommitteeAssignmentRole }) {
  if (role === "Member") return null;
  const config =
    role === "Chair"
      ? { bg: "rgba(34,197,94,0.18)", color: "#22c55e", label: "Chair" }
      : role === "Ranking Member"
        ? {
            bg: "rgba(251,191,36,0.18)",
            color: "#fbbf24",
            label: "Ranking",
          }
        : {
            bg: "rgba(196,181,253,0.18)",
            color: "#c4b5fd",
            label: "Vice Chair",
          };
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: 0.4,
        padding: "2px 6px",
        borderRadius: 4,
        background: config.bg,
        color: config.color,
        textTransform: "uppercase",
        flexShrink: 0,
      }}
    >
      {config.label}
    </span>
  );
}

function SideChip({ side }: { side: "majority" | "minority" }) {
  const color = side === "majority" ? "#f4f4f5" : "rgba(244,244,245,0.55)";
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: 0.4,
        color,
        textTransform: "uppercase",
        flexShrink: 0,
      }}
      title={`Serves on the ${side} side of the committee`}
    >
      {side}
    </span>
  );
}

function CommitteeRow({
  a,
  variant,
}: {
  a: CommitteeAssignment;
  variant: "full" | "sub";
}) {
  const indent = variant === "sub" ? 14 : 0;
  return (
    <div
      style={{
        marginLeft: indent,
        padding: variant === "full" ? "9px 10px" : "7px 10px",
        background:
          variant === "full"
            ? "rgba(255,255,255,0.025)"
            : "rgba(255,255,255,0.015)",
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
            marginBottom: variant === "full" ? 3 : 0,
          }}
        >
          <RoleChip role={a.role} />
          {a.committeeUrl ? (
            <a
              href={a.committeeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: variant === "full" ? 12.5 : 11.5,
                fontWeight: variant === "full" ? 700 : 600,
                color: "#f4f4f5",
                textDecoration: "underline",
                textDecorationColor: "rgba(196,181,253,0.35)",
                textUnderlineOffset: 2,
              }}
            >
              {a.committeeName}
            </a>
          ) : (
            <span
              style={{
                fontSize: variant === "full" ? 12.5 : 11.5,
                fontWeight: variant === "full" ? 700 : 600,
                color: "#f4f4f5",
              }}
            >
              {a.committeeName}
            </span>
          )}
          <SideChip side={a.side} />
        </div>
        {variant === "full" && a.jurisdiction ? (
          <div
            style={{
              fontSize: 10.5,
              color: "rgba(244,244,245,0.5)",
              lineHeight: 1.5,
              marginTop: 3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {a.jurisdiction}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CommitteesSection({
  bioguide,
}: {
  bioguide: string;
}) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch(`/api/committees/${bioguide}`);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({
            status: "error",
            message: body?.error || "Request failed",
          });
          return;
        }
        setState({ status: "ready", report: body as CommitteesReport });
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
        Loading committee assignments…
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
        Could not load committees: {state.message}
      </div>
    );
  }

  const { fullCommittees, subcommittees, leadership, total } = state.report;

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
        No current committee assignments on file. (Freshly-seated members
        may not yet have been assigned.)
      </div>
    );
  }

  // Group subcommittees by their parent committee thomas_id so we can
  // render them indented under each full committee in order.
  const subsByParent = new Map<string, CommitteeAssignment[]>();
  for (const s of subcommittees) {
    const key = s.parentThomasId || "_unknown";
    const bucket = subsByParent.get(key);
    if (bucket) bucket.push(s);
    else subsByParent.set(key, [s]);
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
          {fullCommittees.length}{" "}
          {fullCommittees.length === 1 ? "committee" : "committees"} ·{" "}
          {subcommittees.length}{" "}
          {subcommittees.length === 1 ? "subcommittee" : "subcommittees"}
        </div>
        {leadership.length > 0 ? (
          <div
            style={{
              fontSize: 11,
              color: "rgba(244,244,245,0.65)",
            }}
          >
            <span style={{ color: "#22c55e" }}>
              {leadership.length} leadership{" "}
              {leadership.length === 1 ? "role" : "roles"}
            </span>
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {fullCommittees.map((c) => {
          const children = subsByParent.get(c.thomasId) ?? [];
          return (
            <div
              key={c.thomasId}
              style={{ display: "flex", flexDirection: "column", gap: 4 }}
            >
              <CommitteeRow a={c} variant="full" />
              {children.length > 0 ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  {children.map((s) => (
                    <CommitteeRow key={s.thomasId} a={s} variant="sub" />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div
        style={{
          fontSize: 10,
          color: "rgba(244,244,245,0.4)",
          lineHeight: 1.5,
        }}
      >
        Source: unitedstates/congress-legislators committee-membership-current
        (community-maintained from official chamber rosters). Updates daily.
      </div>
    </div>
  );
}
