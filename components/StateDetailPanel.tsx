"use client";

import { useState } from "react";
import {
  PARTY_COLORS,
  type Legislator,
  type Party,
} from "@/lib/data/legislators";
import { stateByCode } from "@/lib/data/states";

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

  // Direct <img> instead of next/image to avoid hostname allow-list pain
  // during early dev — we'll switch to next/image with a remotePatterns
  // config entry for theunitedstates.io once we add it to next.config.ts.
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

function LegislatorRow({ leg }: { leg: Legislator }) {
  const color = PARTY_COLORS[leg.party];
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
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
          <span>Alignment score: coming soon</span>
          <span>Donor map: coming soon</span>
        </div>
      </div>
    </div>
  );
}

export default function StateDetailPanel({
  selectedState,
  legislators,
  onClose,
}: {
  selectedState: string | null;
  legislators: Legislator[];
  onClose: () => void;
}) {
  if (!selectedState) return null;
  const state = stateByCode(selectedState);
  if (!state) return null;

  const senators = legislators.filter((l) => l.chamber === "Senate");
  const reps = legislators.filter((l) => l.chamber === "House");

  return (
    <aside
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        bottom: 16,
        width: 380,
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
        zIndex: 20,
        fontFamily:
          "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
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
                <LegislatorRow key={s.bioguide} leg={s} />
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
                <LegislatorRow key={r.bioguide} leg={r} />
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
        Roster data: github.com/unitedstates/congress-legislators · Portraits:
        theunitedstates.io/images/congress
      </footer>
    </aside>
  );
}
