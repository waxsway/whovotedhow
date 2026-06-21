"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { Donor, DonorReport } from "@/lib/data/donors";

// Radial bubble chart — politician portrait in the center, donor bubbles
// arranged around them in an organic ring. Bubble radius is proportional to
// sqrt(amount) so the area is proportional to the dollar amount (the visual
// honesty rule: if X gave 4x as much as Y, X's bubble is 4x the area, not 4x
// the diameter). Implemented with d3.forceSimulation so the layout settles
// into a packed circle the way the reference image does.

type Props = {
  report: DonorReport;
  portraitUrl: string;
  legislatorName: string;
};

type Node = {
  id: string;
  donor: Donor;
  r: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number;
  fy?: number;
};

const CHART_SIZE = 520;
const CENTER = CHART_SIZE / 2;
const CENTER_RADIUS = 78; // central portrait bubble radius

function formatDollarsShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatDollarsLong(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

// Hashed hue for stable per-donor color. Different donors get visually
// distinct fills so the chart reads as "many different organizations gave"
// rather than a uniform field.
function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 55% 52%)`;
}

function initials(name: string): string {
  const parts = name
    .split(/[\s&]+/)
    .filter((p) => p.length > 0 && !/^(and|of|the)$/i.test(p));
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function DonorBubbleChart({
  report,
  portraitUrl,
  legislatorName,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Compute radii once per donor list. We scale by sqrt so the chart reads
  // visually honestly. The ratio top:smallest is clamped so a $5M giant
  // doesn't crush the $5K bubbles into 1px specks.
  const initial = useMemo<Node[]>(() => {
    if (report.donors.length === 0) return [];
    const max = Math.max(...report.donors.map((d) => d.total));
    const min = Math.min(...report.donors.map((d) => d.total));
    const minR = 14;
    const maxR = 52;
    const scale = d3
      .scaleSqrt()
      .domain([Math.max(min, 1), Math.max(max, min + 1)])
      .range([minR, maxR]);
    return report.donors.map((donor, i) => ({
      id: `${i}-${donor.name}`,
      donor,
      r: scale(donor.total),
      x: CENTER + (Math.random() - 0.5) * 40,
      y: CENTER + (Math.random() - 0.5) * 40,
      vx: 0,
      vy: 0,
    }));
  }, [report.donors]);

  useEffect(() => {
    if (initial.length === 0) {
      setNodes([]);
      return;
    }
    const ns = initial.map((n) => ({ ...n }));
    const sim = d3
      .forceSimulation<Node>(ns)
      .force(
        "center",
        d3
          .forceRadial<Node>(
            (d) => CENTER_RADIUS + d.r + 20,
            CENTER,
            CENTER
          )
          .strength(0.18)
      )
      .force(
        "collide",
        d3
          .forceCollide<Node>()
          .radius((d) => d.r + 1.5)
          .iterations(3)
      )
      .force("charge", d3.forceManyBody<Node>().strength(-3))
      // Soft pull toward center so outer bubbles don't fly off
      .force("x", d3.forceX<Node>(CENTER).strength(0.02))
      .force("y", d3.forceY<Node>(CENTER).strength(0.02))
      .alpha(1)
      .alphaDecay(0.025)
      .on("tick", () => {
        setNodes(ns.map((n) => ({ ...n })));
      });
    return () => {
      sim.stop();
    };
  }, [initial]);

  if (report.donors.length === 0) {
    return (
      <div
        style={{
          padding: "16px 18px",
          borderRadius: 10,
          background: "rgba(255,255,255,0.02)",
          border: "1px dashed rgba(255,255,255,0.08)",
          fontSize: 12,
          color: "rgba(244,244,245,0.55)",
          lineHeight: 1.6,
        }}
      >
        {report.committeeId
          ? `No employer-aggregated donor data on FEC for cycle ${report.cycle}.
             This usually means the legislator is not on the ballot in this
             cycle and their principal committee has limited activity.`
          : "No principal campaign committee on file at the FEC for this legislator."}
      </div>
    );
  }

  const selectedDonor =
    nodes.find((n) => n.id === selected)?.donor ??
    nodes.find((n) => n.id === hovered)?.donor ??
    null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          fontSize: 10.5,
          color: "rgba(244,244,245,0.5)",
          lineHeight: 1.5,
        }}
      >
        Top {report.donors.length} employer-aggregated donors to{" "}
        <span style={{ color: "rgba(244,244,245,0.8)" }}>
          {report.committeeName ?? "principal campaign committee"}
        </span>{" "}
        for cycle <strong style={{ color: "#f4f4f5" }}>{report.cycle}</strong>.
        Source: FEC.gov. {formatDollarsShort(report.filteredJunkDollars)} of
        self-reported &quot;NOT EMPLOYED / SELF / RETIRED&quot; entries filtered.
      </div>

      <div
        style={{
          position: "relative",
          background:
            "radial-gradient(circle at center, rgba(255,255,255,0.025), rgba(255,255,255,0) 70%)",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
          width="100%"
          height="auto"
          style={{ display: "block" }}
          onClick={(e) => {
            // Click outside any bubble clears selection
            if ((e.target as SVGElement).tagName === "svg") setSelected(null);
          }}
        >
          <defs>
            <clipPath id="portrait-clip">
              <circle cx={CENTER} cy={CENTER} r={CENTER_RADIUS - 4} />
            </clipPath>
            {nodes.map((n) => (
              <clipPath id={`bubble-clip-${n.id}`} key={`clip-${n.id}`}>
                <circle cx={n.x} cy={n.y} r={n.r} />
              </clipPath>
            ))}
          </defs>

          {/* Donor bubbles */}
          {nodes.map((n) => {
            const isHover = n.id === hovered || n.id === selected;
            const fill = colorFor(n.donor.name);
            return (
              <g
                key={n.id}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() =>
                  setHovered((curr) => (curr === n.id ? null : curr))
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected((curr) => (curr === n.id ? null : n.id));
                }}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill={fill}
                  fillOpacity={isHover ? 0.95 : 0.78}
                  stroke={isHover ? "#f4f4f5" : "rgba(0,0,0,0.35)"}
                  strokeWidth={isHover ? 2 : 1}
                />
                {n.r >= 18 ? (
                  <text
                    x={n.x}
                    y={n.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="rgba(255,255,255,0.95)"
                    fontSize={Math.max(9, Math.min(14, n.r / 2.4))}
                    fontWeight={800}
                    pointerEvents="none"
                    style={{ userSelect: "none" }}
                  >
                    {initials(n.donor.name)}
                  </text>
                ) : null}
              </g>
            );
          })}

          {/* Central portrait bubble */}
          <g pointerEvents="none">
            <circle
              cx={CENTER}
              cy={CENTER}
              r={CENTER_RADIUS}
              fill="#0a0f1c"
              stroke="rgba(196,181,253,0.6)"
              strokeWidth={2}
            />
            <image
              href={portraitUrl}
              x={CENTER - (CENTER_RADIUS - 4)}
              y={CENTER - (CENTER_RADIUS - 4)}
              width={(CENTER_RADIUS - 4) * 2}
              height={(CENTER_RADIUS - 4) * 2}
              clipPath="url(#portrait-clip)"
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        </svg>

        {/* Detail readout for hovered/selected donor */}
        <div
          style={{
            position: "absolute",
            left: 12,
            bottom: 12,
            right: 12,
            background: "rgba(10,14,28,0.85)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12,
            color: "#f4f4f5",
            opacity: selectedDonor ? 1 : 0.6,
            transition: "opacity 120ms ease",
            minHeight: 48,
          }}
        >
          {selectedDonor ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 13 }}>
                  {selectedDonor.name}
                </span>
                <span style={{ fontWeight: 800, color: "#c4b5fd" }}>
                  {formatDollarsLong(selectedDonor.total)}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(244,244,245,0.55)",
                  marginTop: 4,
                }}
              >
                {selectedDonor.count.toLocaleString()} individual contributions
                aggregated by employer{" "}
                {selectedDonor.rawNames.length > 1
                  ? ` · ${selectedDonor.rawNames.length} raw name variants merged`
                  : ""}
              </div>
            </>
          ) : (
            <div style={{ color: "rgba(244,244,245,0.55)" }}>
              Hover or click a bubble to see the donor and amount given to{" "}
              {legislatorName}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
