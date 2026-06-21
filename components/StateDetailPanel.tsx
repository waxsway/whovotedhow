"use client";

import { useEffect, useState } from "react";
import {
  PARTY_COLORS,
  getLegislatorElectionCycle,
  formatTenure,
  type Legislator,
  type Party,
} from "@/lib/data/legislators";
import {
  formatFinancialShort,
  getGovernmentSalary,
  getNetWorth,
} from "@/lib/data/finances";
import { stateByCode } from "@/lib/data/states";
import type { LegislatorVote, CastCode } from "@/lib/data/votes";
import type { DonorReport } from "@/lib/data/donors";
import DonorBubbleChart from "@/components/DonorBubbleChart";
import OutsideSpendingSection from "@/components/OutsideSpendingSection";
import StockTradesSection from "@/components/StockTradesSection";
import CommitteesSection from "@/components/CommitteesSection";
import BillsSection from "@/components/BillsSection";
import GovernorSection from "@/components/GovernorSection";
import CollapsibleSection from "@/components/CollapsibleSection";
import CandidatesSection from "@/components/CandidatesSection";
import JudgesSection from "@/components/JudgesSection";
import VoterInfoSection from "@/components/VoterInfoSection";

type AlignmentResult = {
  bioguide: string;
  party: "D" | "R" | "I";
  method: string;
  votesConsidered: number;
  withParty: number;
  againstParty: number;
  percentage: number;
};

type StatementAlignmentIssue = {
  issueId: string;
  issueTitle: string;
  stance: {
    direction: "favors" | "opposes";
    statement: string;
    source: string;
    sourceLabel: string;
  };
  matchingVotes: Array<{
    congress: number;
    rollnumber: number;
    date: string;
    voteDesc: string;
    billNumber: string | null;
    cast: string;
    consistent: boolean;
    billDescription: string;
    billSourceUrl: string | null;
  }>;
  consistentCount: number;
  inconsistentCount: number;
  consideredCount: number;
  aligned: boolean | null;
};

type ConstituentAlignmentResult = {
  bioguide: string;
  stateCode: string;
  pvi: { code: string; pvi: number; label: string } | null;
  legislatorParty: "D" | "R" | "I";
  stateLean: "D" | "R" | "EVEN";
  partyLineConsistency: number;
  constituentAlignment: number | null;
  rationale: string;
};

type StatementAlignmentResult =
  | { available: false; reason: string }
  | {
      available: true;
      bioguide: string;
      method: "statement-vs-vote";
      perIssue: StatementAlignmentIssue[];
      issuesAligned: number;
      issuesInconsistent: number;
      issuesUnscored: number;
      overallPercentage: number | null;
    };

// Tracks whether the viewport is narrow (mobile/portrait phone). When true,
// the side panel renders as a bottom sheet across the full screen width
// rather than a fixed 420px right column. The breakpoint is 768px (md in
// Tailwind), matching the top bar's collapse point.
function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 767px)");
    const update = () => setNarrow(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return narrow;
}

function partyLabel(p: Party): string {
  switch (p) {
    case "D":
      return "Democrat";
    case "R":
      return "Republican";
    case "I":
      return "Independent";
    default:
      return "Other";
  }
}

const CAST_COLORS: Record<CastCode, string> = {
  Yea: "#22c55e",
  Nay: "#ef4444",
  Present: "#eab308",
  "Not Voting": "#71717a",
  Other: "#71717a",
};

function PortraitImage({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        style={{
          width: 56,
          height: 68,
          borderRadius: 6,
          background: "rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.25)",
          fontSize: 10,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        no photo
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      width={56}
      height={68}
      onError={() => setFailed(true)}
      style={{
        width: 56,
        height: 68,
        borderRadius: 6,
        objectFit: "cover",
        background: "rgba(255,255,255,0.04)",
        flexShrink: 0,
      }}
    />
  );
}

function formatDate(iso: string): string {
  // Voteview gives ISO YYYY-MM-DD. Render as "Mar 14, 2025" for readability.
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

function VotesList({
  bioguide,
  chamber,
}: {
  bioguide: string;
  chamber: "Senate" | "House";
}) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; votes: LegislatorVote[] }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        const url = `/api/votes/${bioguide}?chamber=${encodeURIComponent(chamber)}`;
        const res = await fetch(url);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: "error", message: body?.error || "Request failed" });
          return;
        }
        setState({
          status: "ready",
          votes: Array.isArray(body?.votes) ? body.votes : [],
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
  }, [bioguide, chamber]);

  if (state.status === "loading") {
    return (
      <div
        style={{
          fontSize: 12,
          color: "rgba(244,244,245,0.45)",
          padding: "6px 2px",
        }}
      >
        Loading recent votes…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        style={{
          fontSize: 12,
          color: "#fca5a5",
          padding: "6px 2px",
        }}
      >
        Could not load votes: {state.message}
      </div>
    );
  }

  if (state.votes.length === 0) {
    return (
      <div
        style={{
          fontSize: 12,
          color: "rgba(244,244,245,0.45)",
          padding: "6px 2px",
        }}
      >
        No recent votes on file. May be a newly seated member or a vote-data gap.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {state.votes.map((v) => (
        <div
          key={`${v.congress}-${v.chamber}-${v.rollnumber}`}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: 0.5,
              padding: "3px 6px",
              borderRadius: 5,
              background: `${CAST_COLORS[v.cast]}1f`,
              color: CAST_COLORS[v.cast],
              flexShrink: 0,
              textTransform: "uppercase",
              minWidth: 38,
              textAlign: "center",
              marginTop: 1,
            }}
          >
            {v.cast === "Not Voting" ? "NV" : v.cast.slice(0, 3)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                color: "rgba(244,244,245,0.92)",
                lineHeight: 1.45,
                marginBottom: 4,
              }}
            >
              {v.voteDesc || v.voteQuestion}
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                fontSize: 10.5,
                color: "rgba(244,244,245,0.5)",
                flexWrap: "wrap",
              }}
            >
              <span>{formatDate(v.date)}</span>
              {v.billNumber ? (
                <span style={{ fontFamily: "monospace" }}>{v.billNumber}</span>
              ) : null}
              <span>
                Result: {v.voteResult || "—"} ({v.yeaCount}-{v.nayCount})
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConstituentAlignmentBadge({ leg }: { leg: Legislator }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; result: ConstituentAlignmentResult }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    if (leg.party === "Other") {
      setState({ status: "error", message: "No party on file" });
      return;
    }
    setState({ status: "loading" });
    (async () => {
      try {
        const url = `/api/constituent-alignment/${leg.bioguide}?chamber=${encodeURIComponent(leg.chamber)}&party=${encodeURIComponent(leg.party)}&state=${encodeURIComponent(leg.state)}`;
        const res = await fetch(url);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: "error", message: body?.error || "Request failed" });
          return;
        }
        setState({ status: "ready", result: body as ConstituentAlignmentResult });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setState({ status: "error", message: msg });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leg.bioguide, leg.chamber, leg.party, leg.state]);

  if (leg.party === "Other") return null;

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
        Computing constituent-vote alignment…
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
        Could not compute constituent alignment: {state.message}
      </div>
    );
  }

  const { pvi, stateLean, constituentAlignment, rationale, partyLineConsistency } =
    state.result;

  if (!pvi) {
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
        {rationale}
      </div>
    );
  }

  // Color the PVI label by direction
  const pviColor =
    pvi.pvi > 0
      ? "#3b82f6"
      : pvi.pvi < 0
        ? "#ef4444"
        : "rgba(244,244,245,0.65)";

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
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "rgba(244,244,245,0.92)",
            }}
          >
            Constituent-vote alignment
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: "rgba(244,244,245,0.5)",
              marginTop: 3,
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span>State partisan lean:</span>
            <span
              style={{
                fontWeight: 800,
                color: pviColor,
                letterSpacing: 0.5,
                fontSize: 11,
              }}
            >
              {pvi.label}
            </span>
            <span>(Cook PVI 2025)</span>
          </div>
        </div>
        {constituentAlignment !== null ? (
          <span
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: pviColor,
              letterSpacing: -0.5,
            }}
          >
            {constituentAlignment}%
          </span>
        ) : (
          <span
            style={{
              fontSize: 11,
              color: "rgba(244,244,245,0.5)",
              maxWidth: 140,
              textAlign: "right",
            }}
          >
            {stateLean === "EVEN"
              ? "Swing state — no single-number alignment"
              : "Score unavailable"}
          </span>
        )}
      </div>

      {constituentAlignment !== null ? (
        <div
          style={{
            display: "flex",
            height: 4,
            borderRadius: 3,
            overflow: "hidden",
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              flexBasis: `${constituentAlignment}%`,
              background: pviColor,
            }}
          />
        </div>
      ) : null}

      <div
        style={{
          fontSize: 11,
          color: "rgba(244,244,245,0.6)",
          lineHeight: 1.55,
        }}
      >
        {rationale}
        {constituentAlignment !== null ? (
          <>
            {" "}Party-line consistency for context: {partyLineConsistency}%.
          </>
        ) : null}
      </div>

      <div
        style={{
          fontSize: 10,
          color: "rgba(244,244,245,0.35)",
          lineHeight: 1.5,
        }}
      >
        Cook PVI measures how much a state voted more Democratic or Republican
        than the national average across the last two presidential cycles.
        Constituent-vote alignment combines that with recent roll-call voting:
        for a senator whose party matches their state&apos;s lean, voting with
        their party = voting with the state; for a senator whose party
        opposes the state&apos;s lean, voting with their party = voting
        against the state&apos;s lean (and the score inverts accordingly).
      </div>
    </div>
  );
}

function PartyLineProxyBadge({
  leg,
  result,
}: {
  leg: Legislator;
  result: AlignmentResult;
}) {
  const partyName =
    leg.party === "D"
      ? "Democratic"
      : leg.party === "R"
        ? "Republican"
        : "Independent";
  const partyColor = PARTY_COLORS[leg.party];
  const { percentage, withParty, againstParty, votesConsidered } = result;
  return (
    <div
      style={{
        padding: "10px 12px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span
          style={{ fontSize: 13, fontWeight: 700, color: "rgba(244,244,245,0.92)" }}
        >
          Party-line consistency
        </span>
        <span
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: partyColor,
            letterSpacing: -0.5,
          }}
        >
          {percentage}%
        </span>
      </div>
      <div
        style={{
          display: "flex",
          height: 4,
          marginTop: 8,
          borderRadius: 3,
          overflow: "hidden",
          background: "rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            flexBasis: `${percentage}%`,
            background: partyColor,
          }}
        />
      </div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(244,244,245,0.55)",
          marginTop: 8,
          lineHeight: 1.5,
        }}
      >
        Voted with the {partyName} majority on {withParty} of {votesConsidered}{" "}
        recent roll calls (against on {againstParty}).
      </div>
      <div
        style={{
          fontSize: 10,
          color: "rgba(244,244,245,0.4)",
          marginTop: 6,
          lineHeight: 1.5,
        }}
      >
        Fallback: party-line consistency proxy. Real statement-vs-vote
        alignment for {leg.fullName} requires a sourced public statement on
        a tracked issue — we&apos;ll add it as we curate stances.
      </div>
    </div>
  );
}

function StatementAlignmentReport({
  leg,
  result,
}: {
  leg: Legislator;
  result: Extract<StatementAlignmentResult, { available: true }>;
}) {
  const { overallPercentage, perIssue, issuesAligned, issuesInconsistent } =
    result;
  const partyColor = PARTY_COLORS[leg.party];
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
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "rgba(244,244,245,0.92)",
            }}
          >
            Statement-vote alignment
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: "rgba(244,244,245,0.5)",
              marginTop: 3,
            }}
          >
            {issuesAligned} aligned · {issuesInconsistent} inconsistent
          </div>
        </div>
        {overallPercentage !== null ? (
          <span
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: partyColor,
              letterSpacing: -0.5,
            }}
          >
            {overallPercentage}%
          </span>
        ) : (
          <span
            style={{
              fontSize: 11,
              color: "rgba(244,244,245,0.5)",
              maxWidth: 140,
              textAlign: "right",
            }}
          >
            No matching votes yet on the tracked issues.
          </span>
        )}
      </div>

      {overallPercentage !== null ? (
        <div
          style={{
            display: "flex",
            height: 4,
            borderRadius: 3,
            overflow: "hidden",
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              flexBasis: `${overallPercentage}%`,
              background: partyColor,
            }}
          />
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {perIssue.map((issue) => {
          const aligned = issue.aligned;
          const dotColor =
            aligned === null
              ? "#71717a"
              : aligned
                ? "#22c55e"
                : "#ef4444";
          const label =
            aligned === null
              ? "No matching votes yet"
              : aligned
                ? "Voting record aligns with stated position"
                : "Voting record contradicts stated position";
          return (
            <div
              key={issue.issueId}
              style={{
                padding: "9px 10px",
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: dotColor,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "rgba(244,244,245,0.9)",
                  }}
                >
                  {issue.issueTitle}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 10,
                    color: "rgba(244,244,245,0.5)",
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                    fontWeight: 700,
                  }}
                >
                  {issue.stance.direction === "favors" ? "Favors" : "Opposes"}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: "rgba(244,244,245,0.75)",
                  lineHeight: 1.5,
                  fontStyle: "italic",
                }}
              >
                &ldquo;{issue.stance.statement}&rdquo;
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
                <a
                  href={issue.stance.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "rgba(196,181,253,0.85)",
                    textDecoration: "underline",
                  }}
                >
                  source: {issue.stance.sourceLabel}
                </a>
                <span>·</span>
                <span>{label}</span>
                {issue.consideredCount > 0 ? (
                  <>
                    <span>·</span>
                    <span>
                      {issue.consistentCount}/{issue.consideredCount} consistent
                      votes
                    </span>
                  </>
                ) : null}
              </div>

              {/* Per-vote citations for the bills we matched against. Each
                  vote links to the bill on congress.gov so the reader can
                  verify the receipt. */}
              {issue.matchingVotes.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  {issue.matchingVotes.map((v, i) => (
                    <div
                      key={`${v.congress}-${v.rollnumber}-${i}`}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                        fontSize: 10.5,
                        color: "rgba(244,244,245,0.65)",
                        lineHeight: 1.45,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: 0.4,
                          padding: "2px 5px",
                          borderRadius: 4,
                          background: v.consistent
                            ? "rgba(34,197,94,0.18)"
                            : "rgba(239,68,68,0.18)",
                          color: v.consistent ? "#86efac" : "#fca5a5",
                          textTransform: "uppercase",
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        {v.cast}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        {v.billSourceUrl ? (
                          <a
                            href={v.billSourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "rgba(196,181,253,0.85)",
                              textDecoration: "underline",
                              fontWeight: 700,
                            }}
                          >
                            {v.billNumber}
                          </a>
                        ) : (
                          <span
                            style={{
                              fontWeight: 700,
                              color: "rgba(244,244,245,0.75)",
                            }}
                          >
                            {v.billNumber}
                          </span>
                        )}
                        {" — "}
                        {v.billDescription}
                      </span>
                    </div>
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
        Stances are sourced to specific public statements (linked above).
        Voting record matched against a hand-curated registry of substantive
        landmark bills per issue — not fuzzy keyword scans. Each tagged
        bill explicitly declares whether Yea or Nay advances the issue
        position. An issue is &ldquo;aligned&rdquo; when at least half the
        tagged votes from the legislator moved in their stated direction.
        Bill registry is small and growing; untagged issues honestly show
        &ldquo;no tagged votes yet.&rdquo;
      </div>
    </div>
  );
}

function AlignmentBadge({ leg }: { leg: Legislator }) {
  // Two-stage fetch: try statement-vs-vote first; if no curated stances
  // are on file for this legislator, fall back to the party-line proxy.
  const [statement, setStatement] = useState<
    | { status: "loading" }
    | { status: "ready"; result: StatementAlignmentResult }
    | { status: "error"; message: string }
  >({ status: "loading" });
  const [proxy, setProxy] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "ready"; result: AlignmentResult }
    | { status: "error"; message: string }
  >({ status: "idle" });

  useEffect(() => {
    let cancelled = false;
    if (leg.party === "Other") {
      setStatement({ status: "error", message: "No party affiliation on file." });
      return;
    }
    setStatement({ status: "loading" });
    (async () => {
      try {
        const url = `/api/statement-alignment/${leg.bioguide}?chamber=${encodeURIComponent(leg.chamber)}`;
        const res = await fetch(url);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStatement({
            status: "error",
            message: body?.error || "Request failed",
          });
          return;
        }
        setStatement({ status: "ready", result: body as StatementAlignmentResult });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setStatement({ status: "error", message: msg });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leg.bioguide, leg.chamber, leg.party]);

  // When statement alignment is unavailable, fetch party-line proxy.
  useEffect(() => {
    if (statement.status !== "ready") return;
    if (statement.result.available) return;
    if (leg.party === "Other") return;
    if (proxy.status !== "idle") return;
    let cancelled = false;
    setProxy({ status: "loading" });
    (async () => {
      try {
        const url = `/api/alignment/${leg.bioguide}?chamber=${encodeURIComponent(leg.chamber)}&party=${encodeURIComponent(leg.party)}`;
        const res = await fetch(url);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setProxy({ status: "error", message: body?.error || "Request failed" });
          return;
        }
        setProxy({ status: "ready", result: body as AlignmentResult });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setProxy({ status: "error", message: msg });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statement, leg.bioguide, leg.chamber, leg.party]);

  if (leg.party === "Other") return null;

  if (statement.status === "loading") {
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
        Checking statement-vote alignment…
      </div>
    );
  }
  if (statement.status === "error") {
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
        Could not compute alignment: {statement.message}
      </div>
    );
  }

  if (statement.result.available) {
    return <StatementAlignmentReport leg={leg} result={statement.result} />;
  }

  // No curated stances yet — fall back to party-line proxy.
  if (proxy.status === "loading" || proxy.status === "idle") {
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
        Loading fallback (party-line consistency)…
      </div>
    );
  }
  if (proxy.status === "error") {
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
        Could not compute alignment: {proxy.message}
      </div>
    );
  }
  if (proxy.result.votesConsidered === 0) {
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
        Not enough recent votes to compute alignment yet.
      </div>
    );
  }
  return <PartyLineProxyBadge leg={leg} result={proxy.result} />;
}

function DonorPanel({ leg }: { leg: Legislator }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; report: DonorReport }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    if (leg.fecIds.length === 0) {
      setState({
        status: "error",
        message:
          "No FEC candidate IDs on file for this legislator (rare; usually a newly-seated member).",
      });
      return;
    }
    setState({ status: "loading" });
    (async () => {
      try {
        const fec = leg.fecIds.join(",");
        const cycle = getLegislatorElectionCycle(leg);
        const res = await fetch(
          `/api/donors/${leg.bioguide}?fec=${encodeURIComponent(fec)}&cycle=${cycle}`
        );
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({
            status: "error",
            message: body?.error || "Request failed",
          });
          return;
        }
        setState({ status: "ready", report: body as DonorReport });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setState({ status: "error", message: msg });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leg]);

  if (state.status === "loading") {
    return (
      <div
        style={{
          fontSize: 12,
          color: "rgba(244,244,245,0.45)",
          padding: "6px 2px",
        }}
      >
        Loading donor data from FEC…
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div style={{ fontSize: 12, color: "#fca5a5", padding: "6px 2px" }}>
        Could not load donors: {state.message}
      </div>
    );
  }
  return (
    <DonorBubbleChart
      report={state.report}
      portraitUrl={leg.portraitUrl}
      legislatorName={leg.fullName}
    />
  );
}

function LegislatorRow({
  leg,
  defaultExpanded = false,
}: {
  leg: Legislator;
  defaultExpanded?: boolean;
}) {
  const color = PARTY_COLORS[leg.party];
  const [expanded, setExpanded] = useState(defaultExpanded);

  // If a deep-link surfaces this row after first mount (the panel always
  // mounts before legislators data is ready, so initial defaultExpanded is
  // false), respect the change to defaultExpanded once it flips true.
  useEffect(() => {
    if (defaultExpanded) setExpanded(true);
  }, [defaultExpanded]);

  return (
    <div
      style={{
        borderRadius: 10,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          appearance: "none",
          width: "100%",
          background: "transparent",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          textAlign: "left",
          padding: "10px 12px",
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <PortraitImage url={leg.portraitUrl} alt={leg.fullName} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#f4f4f5",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {leg.fullName}
            </span>
          </div>
          {(() => {
            const salary = getGovernmentSalary(leg.bioguide);
            const netWorth = getNetWorth(leg.bioguide);
            const tenure = formatTenure(leg);
            return (
              <>
                {tenure ? (
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(244,244,245,0.65)",
                      marginBottom: 3,
                      lineHeight: 1.4,
                    }}
                  >
                    {tenure.shortLabel}
                  </div>
                ) : null}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                    fontSize: 11,
                    color: "rgba(244,244,245,0.6)",
                    marginBottom: 4,
                    lineHeight: 1.4,
                  }}
                >
                  <span>
                    Salary:{" "}
                    <strong
                      style={{
                        color: "rgba(244,244,245,0.88)",
                        fontWeight: 700,
                      }}
                    >
                      {formatFinancialShort(salary)}
                    </strong>
                  </span>
                  <span style={{ color: "rgba(244,244,245,0.25)" }}>·</span>
                  {netWorth ? (
                    <span>
                      Net worth:{" "}
                      <strong
                        style={{
                          color: "rgba(244,244,245,0.88)",
                          fontWeight: 700,
                        }}
                      >
                        {formatFinancialShort(netWorth.estimate)}
                      </strong>{" "}
                      <a
                        href={netWorth.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          color: "rgba(196,181,253,0.7)",
                          textDecoration: "underline",
                          fontSize: 10,
                        }}
                      >
                        ({netWorth.sourceLabel} {netWorth.year})
                      </a>
                    </span>
                  ) : (
                    <span style={{ color: "rgba(244,244,245,0.4)" }}>
                      Net worth: not on file
                    </span>
                  )}
                </div>
              </>
            );
          })()}
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontSize: 11,
              color: "rgba(244,244,245,0.55)",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 7px",
                borderRadius: 999,
                background: `${color}1f`,
                color,
                fontWeight: 700,
                letterSpacing: 0.3,
                fontSize: 10,
                textTransform: "uppercase",
              }}
            >
              {partyLabel(leg.party).slice(0, 3)}
            </span>
            <span>
              {leg.chamber === "Senate"
                ? `Senate · Class ${leg.senateClass ?? "?"}`
                : leg.district !== null
                  ? `House · District ${leg.district}`
                  : "House · At-large"}
            </span>
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "rgba(244,244,245,0.4)",
              display: "flex",
              gap: 12,
            }}
          >
            <span>Expand for votes, donors, alignment</span>
          </div>
        </div>
        <div
          aria-hidden
          style={{
            fontSize: 14,
            color: "rgba(244,244,245,0.4)",
            transition: "transform 120ms ease",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </div>
      </button>
      {expanded ? (
        <div
          style={{
            padding: "10px 12px 14px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <CollapsibleSection title="Committee assignments">
            <CommitteesSection bioguide={leg.bioguide} />
          </CollapsibleSection>
          <CollapsibleSection title="Sponsored bills">
            <BillsSection bioguide={leg.bioguide} />
          </CollapsibleSection>
          <CollapsibleSection title="Statement-vote alignment">
            <AlignmentBadge leg={leg} />
          </CollapsibleSection>
          <CollapsibleSection title="Constituent-vote alignment">
            <ConstituentAlignmentBadge leg={leg} />
          </CollapsibleSection>
          <CollapsibleSection title="Recent roll-call votes">
            <VotesList bioguide={leg.bioguide} chamber={leg.chamber} />
          </CollapsibleSection>
          <CollapsibleSection title="Top donors (FEC public record)">
            <DonorPanel leg={leg} />
          </CollapsibleSection>
          <CollapsibleSection title="Outside spending (Super PACs)">
            <OutsideSpendingSection leg={leg} />
          </CollapsibleSection>
          <CollapsibleSection title="Stock trades (STOCK Act disclosures)">
            <StockTradesSection leg={leg} />
          </CollapsibleSection>
        </div>
      ) : null}
    </div>
  );
}

export default function StateDetailPanel({
  selectedState,
  legislators,
  onClose,
  defaultExpandedBioguide,
}: {
  selectedState: string | null;
  legislators: Legislator[];
  onClose: () => void;
  // When set and matching a row, that row starts expanded. Used for the
  // /legislator/{bioguide} deep-link route so a shared URL opens the
  // exact card the sharer wanted to surface.
  defaultExpandedBioguide?: string | null;
}) {
  const narrow = useIsNarrow();

  if (!selectedState) return null;
  const state = stateByCode(selectedState);
  if (!state) return null;

  const senators = legislators.filter((l) => l.chamber === "Senate");
  const reps = legislators.filter((l) => l.chamber === "House");

  // On phones the panel slides up from the bottom as a sheet covering ~75%
  // of viewport height. The map stays visible at the top so the user keeps
  // spatial context while reading the roster.
  const panelStyle: React.CSSProperties = narrow
    ? {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        top: "25vh",
        background: "rgba(10,14,28,0.96)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        boxShadow: "0 -8px 40px rgba(0,0,0,0.55)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 1000,
        fontFamily:
          "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, sans-serif",
      }
    : {
        position: "absolute",
        top: 16,
        right: 16,
        bottom: 16,
        width: 420,
        maxWidth: "calc(100vw - 32px)",
        background: "rgba(10,14,28,0.92)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 1000,
        fontFamily:
          "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, sans-serif",
      };

  return (
    <aside style={panelStyle}>
      <header
        style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: "rgba(244,244,245,0.45)",
              marginBottom: 4,
            }}
          >
            {state.code}
          </div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: -0.4,
              margin: 0,
              color: "#f4f4f5",
            }}
          >
            {state.name}
          </h2>
          <div
            style={{
              fontSize: 12,
              color: "rgba(244,244,245,0.55)",
              marginTop: 4,
            }}
          >
            {senators.length} senator{senators.length === 1 ? "" : "s"}
            {" · "}
            {reps.length} representative{reps.length === 1 ? "" : "s"}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            appearance: "none",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
            color: "rgba(244,244,245,0.7)",
            width: 32,
            height: 32,
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </header>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <section>
          <h3
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: "rgba(244,244,245,0.45)",
              margin: "0 0 10px",
            }}
          >
            Governor
          </h3>
          <GovernorSection stateCode={state.code} />
        </section>

        {senators.length > 0 && (
          <section>
            <h3
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                color: "rgba(244,244,245,0.45)",
                margin: "0 0 10px",
              }}
            >
              Senators
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {senators.map((s) => (
                <LegislatorRow
                  key={s.bioguide}
                  leg={s}
                  defaultExpanded={s.bioguide === defaultExpandedBioguide}
                />
              ))}
            </div>
          </section>
        )}

        {reps.length > 0 && (
          <section>
            <h3
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                color: "rgba(244,244,245,0.45)",
                margin: "0 0 10px",
              }}
            >
              House Representatives
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {reps.map((r) => (
                <LegislatorRow
                  key={r.bioguide}
                  leg={r}
                  defaultExpanded={r.bioguide === defaultExpandedBioguide}
                />
              ))}
            </div>
          </section>
        )}

        {senators.length === 0 && reps.length === 0 && (
          <div
            style={{
              fontSize: 13,
              color: "rgba(244,244,245,0.5)",
              padding: 20,
              textAlign: "center",
            }}
          >
            No current legislators on file for this state.
          </div>
        )}

        <section>
          <h3
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: "rgba(244,244,245,0.45)",
              margin: "0 0 10px",
            }}
          >
            Running for office
          </h3>
          <CandidatesSection stateCode={state.code} />
        </section>

        <section>
          <h3
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: "rgba(244,244,245,0.45)",
              margin: "0 0 10px",
            }}
          >
            Federal judges
          </h3>
          <JudgesSection stateCode={state.code} />
        </section>

        <section>
          <h3
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: "rgba(244,244,245,0.45)",
              margin: "0 0 10px",
            }}
          >
            Vote
          </h3>
          <VoterInfoSection stateCode={state.code} />
        </section>
      </div>

      <footer
        style={{
          padding: "10px 16px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: 10.5,
          color: "rgba(244,244,245,0.4)",
          lineHeight: 1.55,
        }}
      >
        Sources: unitedstates/congress-legislators · voteview.com · fec.gov ·
        api.congress.gov · fjc.gov · efdsearch.senate.gov · disclosures-clerk.house.gov ·
        vote.gov — full methodology + citations on the{" "}
        <a
          href="/about"
          style={{
            color: "rgba(196,181,253,0.7)",
            textDecoration: "underline",
          }}
        >
          About page
        </a>
      </footer>
    </aside>
  );
}
