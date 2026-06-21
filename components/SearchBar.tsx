"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PARTY_COLORS,
  type Legislator,
  type Party,
} from "@/lib/data/legislators";
import { stateByCode } from "@/lib/data/states";

function partyShort(p: Party): string {
  return p === "D" ? "Dem" : p === "R" ? "Rep" : p === "I" ? "Ind" : "Oth";
}

// Score a legislator against a search query so the best matches surface first.
// Higher score = better match. Returns 0 if no match.
function scoreMatch(leg: Legislator, q: string): number {
  if (!q) return 0;
  const ql = q.toLowerCase();
  const full = leg.fullName.toLowerCase();
  const last = leg.lastName.toLowerCase();
  const first = leg.firstName.toLowerCase();
  const stateCode = leg.state.toLowerCase();
  const stateName = (stateByCode(leg.state)?.name ?? "").toLowerCase();

  // 2-letter exact match against state code (e.g. "ca" or "tx")
  if (ql.length === 2 && ql === stateCode) return 95;

  if (last.startsWith(ql)) return 100 - Math.min(10, ql.length);
  if (first.startsWith(ql)) return 88 - Math.min(8, ql.length);
  if (full.startsWith(ql)) return 84;

  if (last.includes(ql)) return 72;
  if (full.includes(ql)) return 68;
  if (first.includes(ql)) return 62;

  if (stateName.startsWith(ql)) return 50;
  if (stateName.includes(ql)) return 42;

  return 0;
}

const MAX_RESULTS = 8;

export default function SearchBar({
  legislators,
}: {
  legislators: Legislator[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q || legislators.length === 0) return [];
    const scored = legislators
      .map((leg) => ({ leg, score: scoreMatch(leg, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS);
    return scored;
  }, [legislators, query]);

  // Reset highlight when results change
  useEffect(() => {
    setHighlight(0);
  }, [results.length, query]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!focused) return;
    function onClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [focused]);

  function navigateTo(leg: Legislator) {
    setQuery("");
    setFocused(false);
    inputRef.current?.blur();
    router.push(`/legislator/${leg.bioguide}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) {
      if (e.key === "Escape") setFocused(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[highlight];
      if (pick) navigateTo(pick.leg);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  }

  const isOpen = focused && results.length > 0;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        fontFamily:
          "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      <input
        ref={inputRef}
        type="search"
        placeholder={
          legislators.length === 0
            ? "Loading roster…"
            : "Search a senator, rep, or state…"
        }
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck={false}
        disabled={legislators.length === 0}
        style={{
          width: "100%",
          padding: "9px 12px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(10,14,28,0.85)",
          color: "#f4f4f5",
          fontSize: 13,
          outline: "none",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      />
      {isOpen ? (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "rgba(10,14,28,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            overflow: "hidden",
            zIndex: 2000,
          }}
        >
          {results.map(({ leg }, i) => {
            const isActive = i === highlight;
            const state = stateByCode(leg.state);
            const color = PARTY_COLORS[leg.party];
            return (
              <button
                key={leg.bioguide}
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus on input
                  navigateTo(leg);
                }}
                onMouseEnter={() => setHighlight(i)}
                style={{
                  appearance: "none",
                  border: "none",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  background: isActive
                    ? "rgba(255,255,255,0.06)"
                    : "transparent",
                  color: "#f4f4f5",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  borderBottom:
                    i < results.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "none",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 30,
                    padding: "2px 6px",
                    borderRadius: 999,
                    fontSize: 9.5,
                    fontWeight: 800,
                    background: `${color}24`,
                    color,
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                  }}
                >
                  {partyShort(leg.party)}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontWeight: 700,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {leg.fullName}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 10.5,
                      color: "rgba(244,244,245,0.5)",
                      marginTop: 1,
                    }}
                  >
                    {leg.chamber === "Senate"
                      ? `Sen · ${state?.name ?? leg.state} · Class ${leg.senateClass ?? "?"}`
                      : leg.district !== null
                        ? `Rep · ${state?.name ?? leg.state} · District ${leg.district}`
                        : `Rep · ${state?.name ?? leg.state} · At-large`}
                  </span>
                </span>
                <span
                  style={{
                    fontSize: 9.5,
                    color: "rgba(244,244,245,0.35)",
                    fontFamily: "monospace",
                  }}
                >
                  {leg.bioguide}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
