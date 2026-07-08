import type { Metadata } from "next";
import { Fraunces, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MarketEdge",
  description:
    "Transfer value intelligence — arbitrage signals, recruitment targets, and player similarity from a stacking ensemble model.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${publicSans.variable} ${ibmPlexMono.variable} h-full`}
    >
      <body
        className="min-h-full flex flex-col antialiased"
        style={{ background: "var(--ink)", color: "var(--parchment)" }}
      >
        <Nav />
        <main className="flex-1">{children}</main>
        <footer
          className="text-center py-3 text-xs"
          style={{
            color: "var(--text-secondary)",
            borderTop: "1px solid var(--hairline)",
            fontFamily: "var(--font-ibm-plex-mono)",
            letterSpacing: "0.04em",
          }}
        >
          MARKETEDGE · DATA: TRANSFERMARKT VIA KAGGLE · MODEL: STACKING ENSEMBLE (RF + XGB + LGB + RIDGE)
        </footer>
      </body>
    </html>
  );
}
