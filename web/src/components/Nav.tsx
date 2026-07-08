"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Lookup" },
  { href: "/arbitrage", label: "Board" },
  { href: "/recruitment", label: "Scout" },
  { href: "/similarity", label: "Map" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header
      className="px-6 flex items-center gap-8 h-11"
      style={{ background: "var(--panel)", borderBottom: "1px solid var(--hairline)" }}
    >
      {/* Wordmark */}
      <span
        style={{
          fontFamily: "var(--font-ibm-plex-mono)",
          color: "var(--gold)",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        MARKETEDGE
      </span>

      {/* Nav links */}
      <nav className="flex items-stretch h-full gap-0.5">
        {links.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="relative flex items-center px-3 text-xs transition-colors"
              style={{
                color: active ? "var(--parchment)" : "var(--text-secondary)",
                fontFamily: "var(--font-public-sans)",
                letterSpacing: "0.04em",
                fontWeight: active ? 500 : 400,
              }}
            >
              {label}
              {active && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "2px",
                    background: "var(--gold)",
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Status line */}
      <div className="ml-auto shrink-0">
        <span
          style={{
            fontFamily: "var(--font-ibm-plex-mono)",
            fontSize: "10px",
            color: "var(--text-secondary)",
            letterSpacing: "0.06em",
          }}
        >
          DATA THROUGH 2024 · 88,690 SNAPSHOTS
        </span>
      </div>
    </header>
  );
}
