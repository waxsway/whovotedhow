import { ImageResponse } from "next/og";
import {
  fetchCurrentLegislators,
  groupByState,
  PARTY_COLORS,
  type Legislator,
  type Party,
} from "@/lib/data/legislators";
import { stateByCode } from "@/lib/data/states";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Who Voted How — state delegation";

function BrandMark({ size: s }: { size: number }) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="0" width="100" height="100" rx="22" fill="#0a1e3f" />
      <path
        d="M 20 40 L 32 76 L 44 50 L 56 76 L 78 18"
        stroke="#ffffff"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function partyCounts(legs: Legislator[]): Record<Party, number> {
  const out: Record<Party, number> = { D: 0, R: 0, I: 0, Other: 0 };
  for (const l of legs) out[l.party] += 1;
  return out;
}

async function fallbackImage(message: string): Promise<ImageResponse> {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#05060a",
          color: "#f4f4f5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <BrandMark size={120} />
        <div style={{ fontSize: 52, fontWeight: 800, marginTop: 36 }}>
          Who Voted How
        </div>
        <div
          style={{
            fontSize: 22,
            color: "rgba(244,244,245,0.6)",
            marginTop: 12,
          }}
        >
          {message}
        </div>
      </div>
    ),
    { ...size }
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const state = stateByCode((code || "").toUpperCase());
  if (!state) return fallbackImage("Free political accountability map");

  let legislators: Legislator[] = [];
  try {
    const all = await fetchCurrentLegislators();
    legislators = groupByState(all).get(state.code) ?? [];
  } catch {
    return fallbackImage(state.name);
  }

  const senators = legislators.filter((l) => l.chamber === "Senate");
  const reps = legislators.filter((l) => l.chamber === "House");
  const counts = partyCounts(legislators);
  const total = legislators.length || 1;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #05060a 0%, #0a0f1c 60%, #0a1e3f 100%)",
          color: "#f4f4f5",
          fontFamily: "system-ui, sans-serif",
          padding: "60px 72px",
        }}
      >
        {/* Brand row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <BrandMark size={56} />
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: -0.3,
            }}
          >
            Who Voted How
          </div>
        </div>

        {/* Main identity block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 50,
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                padding: "8px 18px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.06)",
                color: "rgba(244,244,245,0.85)",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 1,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              {state.code}
            </div>
            <div
              style={{
                fontSize: 24,
                color: "rgba(244,244,245,0.6)",
                display: "flex",
              }}
            >
              Congressional delegation
            </div>
          </div>

          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1.0,
              letterSpacing: -3,
              color: "#ffffff",
              display: "flex",
            }}
          >
            {state.name}
          </div>

          <div
            style={{
              fontSize: 30,
              color: "rgba(244,244,245,0.7)",
              marginTop: 22,
              display: "flex",
            }}
          >
            {senators.length} senator{senators.length === 1 ? "" : "s"} ·{" "}
            {reps.length} representative{reps.length === 1 ? "" : "s"}
          </div>

          {/* Party-breakdown bar */}
          {legislators.length > 0 ? (
            <div
              style={{
                display: "flex",
                height: 28,
                marginTop: 30,
                borderRadius: 8,
                overflow: "hidden",
                background: "rgba(255,255,255,0.06)",
                width: 700,
              }}
            >
              {(["D", "R", "I", "Other"] as Party[]).map((p) =>
                counts[p] > 0 ? (
                  <div
                    key={p}
                    style={{
                      flexBasis: `${(counts[p] / total) * 100}%`,
                      background: PARTY_COLORS[p],
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0a0f1c",
                      fontWeight: 900,
                      fontSize: 14,
                    }}
                  >
                    {counts[p]} {p}
                  </div>
                ) : null
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: "rgba(244,244,245,0.55)",
              display: "flex",
            }}
          >
            Recent votes · Top FEC donors · Public-record accountability
          </div>
          <div
            style={{
              fontSize: 16,
              color: "rgba(196,181,253,0.85)",
              display: "flex",
            }}
          >
            whovotedhow.org/state/{state.code}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
