"use client";

import { useState, type ReactNode } from "react";

// Generic collapsible section used to wrap each block in the expanded
// legislator row. Each section costs an API fetch on mount, so keeping
// them collapsed by default also saves cold-cache load when users only
// care about one or two data dimensions.
//
// Header is a full-width clickable bar with a chevron that rotates on
// open. Content unmounts entirely when closed (not just hidden), so
// child components don't fire useEffect / fetch until opened.

export default function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.06)",
        background: open
          ? "rgba(255,255,255,0.02)"
          : "rgba(255,255,255,0.01)",
        transition: "background 0.15s",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          appearance: "none",
          width: "100%",
          padding: "10px 12px",
          background: "transparent",
          border: "none",
          color: "rgba(244,244,245,0.85)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.7,
          textTransform: "uppercase",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "rgba(244,244,245,1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "rgba(244,244,245,0.85)";
        }}
      >
        <span>{title}</span>
        <span
          aria-hidden
          style={{
            fontSize: 13,
            transition: "transform 0.15s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            color: "rgba(244,244,245,0.5)",
            lineHeight: 1,
          }}
        >
          ▾
        </span>
      </button>
      {open ? (
        <div
          style={{
            padding: "0 10px 10px",
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
