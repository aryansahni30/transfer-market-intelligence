"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Player Lookup" },
  { href: "/arbitrage", label: "Arbitrage Board" },
  { href: "/recruitment", label: "Recruitment" },
  { href: "/similarity", label: "Similar Players" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header
      className="px-6 py-3 flex items-center gap-8"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      <span className="font-bold tracking-tight text-sm whitespace-nowrap" style={{ color: "var(--accent-blue)" }}>
        ⚽ FVI
      </span>
      <nav className="flex gap-1 flex-wrap">
        {links.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="px-3 py-1.5 rounded text-sm transition-colors"
              style={{
                background: active ? "var(--surface2)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
