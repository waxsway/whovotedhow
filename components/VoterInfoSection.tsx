"use client";

import { getVoterInfo, getVoterInfoLinks } from "@/lib/data/voter-info";

// Per-state voter information card. Bridges the gap between
// "I learned about my representatives" and "I can act on that."
// All links are official .gov or nonpartisan authoritative sources.

export default function VoterInfoSection({
  stateCode,
}: {
  stateCode: string;
}) {
  const info = getVoterInfo(stateCode);
  if (!info) {
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
        Voter information not yet available for this state.
      </div>
    );
  }

  const links = getVoterInfoLinks(info);

  return (
    <div
      style={{
        padding: "14px 14px 16px",
        background:
          "linear-gradient(180deg, rgba(59,130,246,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(59,130,246,0.18)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#f4f4f5",
            marginBottom: 4,
          }}
        >
          How to vote in {info.stateName}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "rgba(244,244,245,0.6)",
            lineHeight: 1.55,
          }}
        >
          Knowing who represents you is step one. Step two is showing up.
          These are the official portals and the nonpartisan voter-assistance
          hotline.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {links.map((link, i) => (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "block",
              padding: "10px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8,
              textDecoration: "none",
              color: "inherit",
              transition: "border-color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)";
              e.currentTarget.style.background = "rgba(59,130,246,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            }}
          >
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: "#f4f4f5",
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 3,
              }}
            >
              <span>{link.label}</span>
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(196,181,253,0.65)",
                }}
              >
                ↗
              </span>
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: "rgba(244,244,245,0.55)",
                lineHeight: 1.5,
              }}
            >
              {link.description}
            </div>
          </a>
        ))}
      </div>

      <div
        style={{
          fontSize: 10,
          color: "rgba(244,244,245,0.4)",
          lineHeight: 1.5,
        }}
      >
        Federal portal: vote.gov (U.S. General Services Administration).
        State portal: {info.officialAuthorityName}. Hotline: Election
        Protection (Lawyers&rsquo; Committee for Civil Rights).
      </div>
    </div>
  );
}
