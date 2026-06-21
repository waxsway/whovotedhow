import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial serif for /about and other long-form reading surfaces. Geist
// Sans is right for the map UI but reads cramped at body length; Source
// Serif gives the methodology page the proper register.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://whovotedhow.org"),
  title: {
    default: "Who Voted How — Free Political Accountability Map",
    template: "%s",
  },
  description:
    "A free, deterministic transparency tool. 3D map of the United States showing every politician, their voting record, donors, and where their public statements diverge from how they actually vote.",
  openGraph: {
    type: "website",
    title: "Who Voted How — Free Political Accountability Map",
    description:
      "Recent votes, top FEC donors, and a public-record profile for every member of the US Congress.",
    url: "https://whovotedhow.org",
    siteName: "Who Voted How",
  },
  twitter: {
    card: "summary_large_image",
    title: "Who Voted How — Free Political Accountability Map",
    description:
      "Recent votes, top FEC donors, and a public-record profile for every member of the US Congress.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} antialiased`}
    >
      <body className="m-0 bg-[#05060a] text-zinc-100">{children}</body>
    </html>
  );
}
