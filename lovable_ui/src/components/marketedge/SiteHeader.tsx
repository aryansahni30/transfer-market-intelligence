import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "./GlobalSearch";

const items: { to: string; label: string; kbd: string }[] = [
  { to: "/", label: "Overview", kbd: "01" },
  { to: "/player", label: "Player Lookup", kbd: "02" },
  { to: "/arbitrage", label: "Arbitrage Board", kbd: "03" },
  { to: "/scout", label: "Scout", kbd: "04" },
  { to: "/similar", label: "Similarity Map", kbd: "05" },
];

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center gap-8 px-6 py-3">
        <Link to="/" className="group flex items-center gap-2.5">
          <LogoMark />
          <div className="flex flex-col leading-none">
            <span className="font-display text-[15px] font-semibold tracking-tight">MarketEdge</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              Transfer Intelligence
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((it) => {
            const active = it.to === "/"
              ? pathname === "/"
              : pathname === it.to || pathname.startsWith(it.to + "/");
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "group flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-white/[0.06] text-foreground"
                    : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground",
                )}
              >
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  {it.kbd}
                </span>
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden md:block">
          <GlobalSearch compact />
        </div>
      </div>
      <div className="chalk-line h-px w-full opacity-60" />
    </header>
  );
}

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" className="text-[color:var(--edge-pos)]">
      <rect x="0.5" y="0.5" width="27" height="27" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.4" />
      <path d="M14 4v20M4 14h20" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
      <circle cx="14" cy="14" r="3.4" fill="currentColor" />
      <path d="M14 14 L22 8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
