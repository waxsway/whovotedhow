"use client";

import { useState } from "react";

// Copy-share button for legislator deep-links. Each legislator already
// has a permalink at /legislator/{bioguide}; this just removes the
// friction of having to find the URL in the address bar. Designed for
// Reddit-thread use ("hey check out my senator: <link>").

export default function ShareLinkButton({
  bioguide,
  displayName,
}: {
  bioguide: string;
  // Legislator name used in the brief feedback toast and the
  // fallback clipboard-failed prompt.
  displayName: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/legislator/${bioguide}`;
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
      window.setTimeout(() => setState("idle"), 1800);
    } catch {
      // navigator.clipboard requires a secure context (https or localhost)
      // and user activation; fall back to a prompt the user can copy from.
      try {
        window.prompt(
          `Copy this link to share ${displayName}'s profile:`,
          url
        );
        setState("idle");
      } catch {
        setState("error");
        window.setTimeout(() => setState("idle"), 1800);
      }
    }
  }

  const label =
    state === "copied"
      ? "Link copied"
      : state === "error"
        ? "Copy failed"
        : "Copy share link";

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy share link for ${displayName}`}
      style={{
        appearance: "none",
        padding: "6px 10px",
        background:
          state === "copied"
            ? "rgba(34,197,94,0.15)"
            : "rgba(255,255,255,0.04)",
        border: `1px solid ${
          state === "copied"
            ? "rgba(34,197,94,0.45)"
            : "rgba(255,255,255,0.1)"
        }`,
        borderRadius: 6,
        color:
          state === "copied"
            ? "#22c55e"
            : "rgba(244,244,245,0.8)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.2,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "background 0.15s, border-color 0.15s, color 0.15s",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => {
        if (state !== "copied") {
          e.currentTarget.style.background = "rgba(255,255,255,0.07)";
          e.currentTarget.style.borderColor = "rgba(196,181,253,0.4)";
        }
      }}
      onMouseLeave={(e) => {
        if (state !== "copied") {
          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
        }
      }}
    >
      <span>{label}</span>
    </button>
  );
}
