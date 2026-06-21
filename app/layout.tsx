import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Who Voted How — Free Political Accountability Map",
  description:
    "A free, deterministic transparency tool. 3D map of the United States showing every politician, their voting record, donors, and where their public statements diverge from how they actually vote.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full m-0 bg-[#05060a] text-zinc-100 overflow-hidden">
        {children}
      </body>
    </html>
  );
}
