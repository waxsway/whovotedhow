"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, Stats } from "@react-three/drei";
import * as THREE from "three";
import { geoAlbersUsa, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import {
  PARTY_COLORS,
  type Legislator,
  type LegislatorsByState,
  type Party,
} from "@/lib/data/legislators";
import { stateByFips, type StateRecord } from "@/lib/data/states";

const TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

function makeProjection(): GeoProjection {
  return geoAlbersUsa().scale(1300).translate([0, 0]);
}

type StateFeature = Feature<Polygon | MultiPolygon, { name?: string }>;

export type StateMesh = {
  fips: string;
  state: StateRecord | null;
  name: string;
  shapes: THREE.Shape[];
  centroid: [number, number]; // 2D projected centroid (x, -y in three.js xz plane)
  bounds: { width: number; height: number };
};

function ringsToShape(
  rings: number[][][],
  projection: GeoProjection
): THREE.Shape | null {
  const outer = rings[0];
  if (!outer || outer.length < 3) return null;
  const shape = new THREE.Shape();
  let started = false;
  for (const coord of outer) {
    const p = projection(coord as [number, number]);
    if (!p) continue;
    if (!started) {
      shape.moveTo(p[0], -p[1]);
      started = true;
    } else {
      shape.lineTo(p[0], -p[1]);
    }
  }
  if (!started) return null;
  for (let i = 1; i < rings.length; i++) {
    const ring = rings[i];
    if (!ring || ring.length < 3) continue;
    const hole = new THREE.Path();
    let holeStarted = false;
    for (const coord of ring) {
      const p = projection(coord as [number, number]);
      if (!p) continue;
      if (!holeStarted) {
        hole.moveTo(p[0], -p[1]);
        holeStarted = true;
      } else {
        hole.lineTo(p[0], -p[1]);
      }
    }
    if (holeStarted) shape.holes.push(hole);
  }
  return shape;
}

// Approximate visual centroid from the largest polygon's bounding box.
// d3.geoCentroid is geographically correct but for badge placement we
// want the OPTICAL center of the largest landmass — that puts the CA
// badge in the central valley instead of out in the ocean, and the FL
// badge over the peninsula instead of out over the Keys.
function computeCentroid(shapes: THREE.Shape[]): {
  centroid: [number, number];
  bounds: { width: number; height: number };
} {
  // Find the largest shape by bounding-box area.
  let best: THREE.Shape | null = null;
  let bestArea = 0;
  let bestBox: THREE.Box2 | null = null;
  for (const s of shapes) {
    const box = new THREE.Box2();
    for (const p of s.getPoints(48)) box.expandByPoint(p);
    const area = (box.max.x - box.min.x) * (box.max.y - box.min.y);
    if (area > bestArea) {
      bestArea = area;
      best = s;
      bestBox = box;
    }
  }
  if (!best || !bestBox) return { centroid: [0, 0], bounds: { width: 0, height: 0 } };
  const cx = (bestBox.min.x + bestBox.max.x) / 2;
  const cy = (bestBox.min.y + bestBox.max.y) / 2;
  return {
    centroid: [cx, cy],
    bounds: {
      width: bestBox.max.x - bestBox.min.x,
      height: bestBox.max.y - bestBox.min.y,
    },
  };
}

function buildStateMeshes(
  features: StateFeature[],
  projection: GeoProjection
): StateMesh[] {
  return features.map((f, i) => {
    const shapes: THREE.Shape[] = [];
    if (f.geometry.type === "Polygon") {
      const s = ringsToShape(f.geometry.coordinates, projection);
      if (s) shapes.push(s);
    } else if (f.geometry.type === "MultiPolygon") {
      for (const poly of f.geometry.coordinates) {
        const s = ringsToShape(poly, projection);
        if (s) shapes.push(s);
      }
    }
    const { centroid, bounds } = computeCentroid(shapes);
    const fips = String(f.id ?? i);
    return {
      fips,
      state: stateByFips(fips) ?? null,
      name: f.properties?.name ?? `state-${i}`,
      shapes,
      centroid,
      bounds,
    };
  });
}

function partyBreakdown(legs: Legislator[]): Record<Party, number> {
  const out: Record<Party, number> = { D: 0, R: 0, I: 0, Other: 0 };
  for (const l of legs) out[l.party] += 1;
  return out;
}

function StateMeshComponent({
  state,
  isSelected,
  isHovered,
}: {
  state: StateMesh;
  isSelected: boolean;
  isHovered: boolean;
}) {
  const geometries = useMemo(() => {
    return state.shapes.map((shape) => {
      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: 4,
        bevelEnabled: false,
        steps: 1,
      });
      geom.rotateX(-Math.PI / 2);
      return geom;
    });
  }, [state.shapes]);

  const color = isSelected ? "#3b3f72" : isHovered ? "#262f4a" : "#1e293b";

  return (
    <group>
      {geometries.map((geom, i) => (
        <mesh key={i} geometry={geom} castShadow receiveShadow>
          <meshStandardMaterial color={color} roughness={0.85} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

function StateOutlines({ states }: { states: StateMesh[] }) {
  const lineSegments = useMemo(() => {
    const positions: number[] = [];
    const TOP_Y = 4.05;
    for (const state of states) {
      for (const shape of state.shapes) {
        const points = shape.getPoints(48);
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];
          positions.push(p1.x, TOP_Y, -p1.y);
          positions.push(p2.x, TOP_Y, -p2.y);
        }
        const first = points[0];
        const last = points[points.length - 1];
        if (first && last && (first.x !== last.x || first.y !== last.y)) {
          positions.push(last.x, TOP_Y, -last.y);
          positions.push(first.x, TOP_Y, -first.y);
        }
        for (const hole of shape.holes) {
          const holePoints = hole.getPoints(48);
          for (let i = 0; i < holePoints.length - 1; i++) {
            const p1 = holePoints[i];
            const p2 = holePoints[i + 1];
            positions.push(p1.x, TOP_Y, -p1.y);
            positions.push(p2.x, TOP_Y, -p2.y);
          }
        }
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geom;
  }, [states]);

  return (
    <lineSegments geometry={lineSegments}>
      <lineBasicMaterial color="#64748b" transparent opacity={0.55} />
    </lineSegments>
  );
}

function StateBadge({
  state,
  legislators,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: {
  state: StateMesh;
  legislators: Legislator[];
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (code: string) => void;
  onHover: (code: string | null) => void;
}) {
  if (!state.state) return null;
  const count = legislators.length;
  if (count === 0) return null;

  const breakdown = partyBreakdown(legislators);
  const [cx, cy] = state.centroid;
  // place badge a little above the state surface so it floats
  const BADGE_Y = 18;

  // Width of each party-bar segment proportional to that party's share.
  const total = breakdown.D + breakdown.R + breakdown.I + breakdown.Other;

  return (
    <Html
      position={[cx, BADGE_Y, -cy]}
      center
      distanceFactor={350}
      zIndexRange={[100, 0]}
      style={{ pointerEvents: "auto" }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(state.state!.code);
        }}
        onMouseEnter={() => onHover(state.state!.code)}
        onMouseLeave={() => onHover(null)}
        style={{
          appearance: "none",
          border: "none",
          padding: "8px 10px",
          borderRadius: 10,
          cursor: "pointer",
          background: isSelected
            ? "rgba(59,63,114,0.95)"
            : isHovered
              ? "rgba(38,47,74,0.95)"
              : "rgba(13,18,32,0.90)",
          color: "#f4f4f5",
          boxShadow: isSelected
            ? "0 0 0 1px rgba(196,181,253,0.55), 0 4px 14px rgba(0,0,0,0.45)"
            : "0 0 0 1px rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.35)",
          fontFamily:
            "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, sans-serif",
          minWidth: 70,
          transition: "background 120ms ease, box-shadow 120ms ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.2 }}>
            {state.state.code}
          </span>
          <span style={{ fontSize: 11, color: "rgba(244,244,245,0.65)" }}>
            {count}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            height: 3,
            marginTop: 5,
            borderRadius: 2,
            overflow: "hidden",
            background: "rgba(255,255,255,0.08)",
          }}
        >
          {(["D", "R", "I", "Other"] as Party[]).map((p) =>
            breakdown[p] > 0 ? (
              <div
                key={p}
                style={{
                  flexBasis: `${(breakdown[p] / total) * 100}%`,
                  background: PARTY_COLORS[p],
                }}
              />
            ) : null
          )}
        </div>
      </button>
    </Html>
  );
}

function MapScene({
  states,
  legislatorsByState,
  selectedState,
  hoveredState,
  onSelectState,
  onHoverState,
}: {
  states: StateMesh[];
  legislatorsByState: LegislatorsByState;
  selectedState: string | null;
  hoveredState: string | null;
  onSelectState: (code: string | null) => void;
  onHoverState: (code: string | null) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[300, 600, 400]}
        intensity={1.05}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <hemisphereLight args={["#3b82f6", "#0a0f1c", 0.25]} />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.5, 0]}
        receiveShadow
        onPointerDown={() => onSelectState(null)}
      >
        <planeGeometry args={[2400, 1600]} />
        <meshStandardMaterial color="#0a0f1c" roughness={1} metalness={0} />
      </mesh>

      {states.map((s) => (
        <StateMeshComponent
          key={s.fips}
          state={s}
          isSelected={s.state?.code === selectedState}
          isHovered={s.state?.code === hoveredState}
        />
      ))}
      <StateOutlines states={states} />
      {states.map((s) => {
        if (!s.state) return null;
        const legs = legislatorsByState.get(s.state.code) ?? [];
        return (
          <StateBadge
            key={`badge-${s.fips}`}
            state={s}
            legislators={legs}
            isSelected={s.state.code === selectedState}
            isHovered={s.state.code === hoveredState}
            onSelect={(code) => onSelectState(code)}
            onHover={onHoverState}
          />
        );
      })}
    </>
  );
}

export default function USMap3D({
  legislatorsByState,
  selectedState,
  onSelectState,
}: {
  legislatorsByState: LegislatorsByState;
  selectedState: string | null;
  onSelectState: (code: string | null) => void;
}) {
  const [states, setStates] = useState<StateMesh[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(TOPOJSON_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const topo = await res.json();
        const fc = feature(topo, topo.objects.states) as unknown as {
          features: StateFeature[];
        };
        if (cancelled) return;
        setStates(buildStateMeshes(fc.features, makeProjection()));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#05060a] text-zinc-400">
        <div className="text-center">
          <div className="text-sm uppercase tracking-widest text-zinc-500 mb-2">
            Map unavailable
          </div>
          <div className="text-zinc-300">{error}</div>
        </div>
      </div>
    );
  }

  if (!states) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#05060a] text-zinc-400">
        <div className="text-center">
          <div className="text-sm uppercase tracking-widest text-zinc-500 mb-2">
            Loading
          </div>
          <div className="text-zinc-300">United States geography</div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <Canvas
        shadows
        camera={{ position: [0, 700, 500], fov: 38, near: 1, far: 5000 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#05060a"]} />
        <fog attach="fog" args={["#05060a", 1200, 2400]} />
        <MapScene
          states={states}
          legislatorsByState={legislatorsByState}
          selectedState={selectedState}
          hoveredState={hoveredState}
          onSelectState={onSelectState}
          onHoverState={setHoveredState}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={150}
          maxDistance={1800}
          maxPolarAngle={Math.PI / 2.05}
          target={[0, 0, 0]}
        />
        {process.env.NODE_ENV === "development" ? <Stats /> : null}
      </Canvas>
    </div>
  );
}
