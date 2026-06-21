import { ImageResponse } from "next/og";
import {
  findLegislatorByBioguide,
  PARTY_COLORS,
  type Party,
} from "@/lib/data/legislators";
import { stateByCode } from "@/lib/data/states";

// Dynamic OG image for /legislator/{bioguide}. Next.js auto-routes this to
// /legislator/{bioguide}/opengraph-image.png and wires the og:image and
// twitter:image meta tags from this file's exports. When someone pastes
// the link in X, iMessage, Slack, Discord, LinkedIn, Telegram, etc. they
// get a rich card with the legislator's actual photo + name + party.

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Who Voted How — legislator profile";

function partyLabel(p: Party): string {
  return p === "D"
    ? "Democrat"
    : p === "R"
      ? "Republican"
      : p === "I"
        ? "Independent"
        : "Other";
}

// Brand-mark glyph rendered inline as SVG so we don't have to fetch any
// asset (ImageResponse can fetch external URLs but inline is faster + less
// fragile). Matches the W+check favicon visually.
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
  params: Promise<{ bioguide: string }>;
}) {
  const { bioguide } = await params;

  let legislator;
  try {
    legislator = await findLegislatorByBioguide(bioguide);
  } catch {
    return fallbackImage("Free political accountability map");
  }

  if (!legislator) {
    return fallbackImage("Free political accountability map");
  }

  const state = stateByCode(legislator.state);
  const stateName = state?.name ?? legislator.state;
  const accent = PARTY_COLORS[legislator.party];
  const chamberLine =
    legislator.chamber === "Senate"
      ? `${stateName} · Senate · Class ${legislator.senateClass ?? "?"}`
      : legislator.district !== null
        ? `${stateName} · House · District ${legislator.district}`
        : `${stateName} · House · At-large`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background:
            "linear-gradient(135deg, #05060a 0%, #0a0f1c 60%, #0a1e3f 100%)",
          color: "#f4f4f5",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Accent bar on the left in party color */}
        <div
          style={{
            width: 14,
            background: accent,
            display: "flex",
          }}
        />

        {/* Portrait column */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "44px 32px 44px 56px",
          }}
        >
          <div
            style={{
              width: 420,
              height: 510,
              borderRadius: 28,
              overflow: "hidden",
              background: "rgba(255,255,255,0.04)",
              border: `4px solid ${accent}`,
              display: "flex",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={legislator.portraitUrl}
              alt={legislator.fullName}
              width={420}
              height={510}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        </div>

        {/* Text column */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "60px 64px 56px 16px",
          }}
        >
          {/* Brand row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <BrandMark size={48} />
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: -0.3,
              }}
            >
              Who Voted How
            </div>
          </div>

          {/* Main identity block */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  background: `${accent}26`,
                  color: accent,
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                {partyLabel(legislator.party)}
              </div>
            </div>
            <div
              style={{
                fontSize: 68,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: -1.5,
                color: "#ffffff",
                maxWidth: 640,
                display: "flex",
              }}
            >
              {legislator.fullName}
            </div>
            <div
              style={{
                fontSize: 28,
                color: "rgba(244,244,245,0.65)",
                marginTop: 18,
                display: "flex",
              }}
            >
              {chamberLine}
            </div>
          </div>

          {/* Footer hint */}
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
              whovotedhow.org/legislator/{legislator.bioguide}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
