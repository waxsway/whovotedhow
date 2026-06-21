import { ImageResponse } from "next/og";

// Default OG image for the homepage and any other route without its own
// opengraph-image.tsx. Renders the brand mark + name + tagline + URL.

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Who Voted How — Free Political Accountability Map";

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

export default async function Image() {
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
          background:
            "radial-gradient(circle at 30% 30%, #0a1e3f 0%, #05060a 65%)",
          color: "#f4f4f5",
          fontFamily: "system-ui, sans-serif",
          padding: "40px 60px",
          textAlign: "center",
        }}
      >
        <BrandMark size={170} />
        <div
          style={{
            fontSize: 84,
            fontWeight: 900,
            letterSpacing: -2,
            marginTop: 42,
            lineHeight: 1,
            display: "flex",
          }}
        >
          Who Voted How
        </div>
        <div
          style={{
            fontSize: 28,
            color: "rgba(244,244,245,0.7)",
            marginTop: 22,
            maxWidth: 980,
            lineHeight: 1.35,
            display: "flex",
            textAlign: "center",
          }}
        >
          Votes, donors, stock trades, sponsored bills, committees, and
          federal judges — every member of Congress and every state. Free,
          sourced, no signup.
        </div>
        <div
          style={{
            fontSize: 20,
            color: "rgba(196,181,253,0.85)",
            marginTop: 36,
            display: "flex",
          }}
        >
          whovotedhow.org
        </div>
      </div>
    ),
    { ...size }
  );
}
