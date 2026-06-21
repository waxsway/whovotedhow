"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  fetchCurrentLegislators,
  groupByState,
  type Legislator,
  type LegislatorsByState,
} from "@/lib/data/legislators";
import StateDetailPanel from "@/components/StateDetailPanel";

// react-three-fiber needs the browser (WebGL + window). Skip SSR.
const USMap3D = dynamic(() => import("@/components/USMap3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#05060a] text-zinc-400">
      <div className="text-center">
        <div className="text-sm uppercase tracking-widest text-zinc-500 mb-2">
          Initializing
        </div>
        <div className="text-zinc-300">Who Voted How</div>
      </div>
    </div>
  ),
});

export default function Home() {
  const [legislators, setLegislators] = useState<Legislator[] | null>(null);
  const [legislatorsError, setLegislatorsError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchCurrentLegislators();
        if (cancelled) return;
        setLegislators(list);
      } catch (err) {
        if (cancelled) return;
        setLegislatorsError(
          err instanceof Error ? err.message : String(err)
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const legislatorsByState: LegislatorsByState = useMemo(() => {
    return legislators ? groupByState(legislators) : new Map();
  }, [legislators]);

  const selectedLegislators = useMemo(() => {
    if (!selectedState) return [];
    return legislatorsByState.get(selectedState) ?? [];
  }, [legislatorsByState, selectedState]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#05060a]">
      <USMap3D
        legislatorsByState={legislatorsByState}
        selectedState={selectedState}
        onSelectState={setSelectedState}
      />

      {/* Title bar — sits over the canvas. */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 px-6 py-5 flex items-start justify-between">
        <div>
          <div className="text-zinc-100 text-lg font-semibold tracking-tight">
            Who Voted How
          </div>
          <div className="text-zinc-500 text-xs mt-1">
            Free political accountability map
          </div>
        </div>
        <div className="text-zinc-600 text-xs text-right max-w-xs leading-relaxed">
          {legislatorsError ? (
            <span className="text-red-400">
              Could not load legislator roster: {legislatorsError}
            </span>
          ) : legislators ? (
            <>
              {legislators.length.toLocaleString()} current members of
              Congress · Click a state badge to view roster
            </>
          ) : (
            <>Loading legislator roster…</>
          )}
        </div>
      </div>

      <StateDetailPanel
        selectedState={selectedState}
        legislators={selectedLegislators}
        onClose={() => setSelectedState(null)}
      />
    </main>
  );
}
