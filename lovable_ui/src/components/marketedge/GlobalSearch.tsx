import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { searchPlayers, type SearchResult } from "@/lib/api";
import { cn } from "@/lib/utils";

export function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchPlayers(q)
        .then((r) => setResults(r.slice(0, 8)))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div ref={ref} className={cn("relative", compact ? "w-64" : "w-full max-w-md")}>
      <div className="flex items-center gap-2 rounded-sm border border-white/10 bg-white/[0.03] px-3 py-2 focus-within:border-[color:var(--edge-pos)]/40">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          placeholder="Search a player — Neymar, Haaland, Saliba…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-96 overflow-auto rounded-sm border border-white/10 bg-popover shadow-xl">
          {results.map((p) => (
            <Link
              key={p.player_id}
              to="/player/$slug"
              params={{ slug: p.slug }}
              onClick={() => { setOpen(false); setQ(""); }}
              className="flex items-center justify-between gap-4 border-b border-white/5 px-3 py-2 text-sm last:border-b-0 hover:bg-white/[0.04]"
            >
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.club} · {p.position_group} · {p.age}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
