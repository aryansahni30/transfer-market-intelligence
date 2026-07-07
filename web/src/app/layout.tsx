import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Football Value Intelligence",
  description:
    "Arbitrage-based football transfer value analysis — discover overpaid and underpaid players.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="text-center py-4 text-xs" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)" }}>
          Football Value Intelligence · Data: Transfermarkt via Kaggle · Model: stacking ensemble (RF + XGB + LGB + Ridge meta-learner)
        </footer>
      </body>
    </html>
  );
}
