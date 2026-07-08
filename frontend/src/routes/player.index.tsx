import { createFileRoute, Link } from "@tanstack/react-router";
import { getArbitrageBoard } from "@/lib/api";
import { GlobalSearch } from "@/components/marketedge/GlobalSearch";
import { ConfidenceBadge } from "@/components/marketedge/ConfidenceBadge";
import { fmtEur } from "@/lib/format";

export const Route = createFileRoute("/player/")({
  loader: async () => {
    const transfers = await getArbitrageBoard({ limit: 12 });
    return { transfers };
  },
  head: () => ({
    meta: [
      { title: "Player Lookup — MarketEdge" },
      { name: "description", content: "Search any player and see their model-predicted fair value range vs. market value and actual fee." },
      { property: "og:title", content: "Player Lookup — MarketEdge" },
      { property: "og:description", content: "Predicted fair value range, drivers, and confidence for any player." },
    ],
  }),
  component: PlayerIndex,
});

function PlayerIndex() {
  const { transfers } = Route.useLoaderData();

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Section 02</div>
      <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Player Lookup</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Search a player to see the model's fair-value range vs. current market value and — if applicable — the actual fee paid.
        Every prediction ships with a confidence level and the factors driving it up or down.
      </p>

      <div className="mt-8 max-w-xl">
        <GlobalSearch />
      </div>

      <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {transfers.map((t) => (
          <Link key={t.id} to="/player/$slug" params={{ slug: t.playerSlug }}
            className="group rounded-sm border border-white/10 bg-card p-4 transition-colors hover:border-white/25"
          >
            <div className="flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t.position} · {t.season}
              </div>
              <ConfidenceBadge level={t.confidence} />
            </div>
            <div className="mt-2 font-display text-lg font-semibold">{t.playerName}</div>
            <div className="text-xs text-muted-foreground">{t.to} · {t.toLeague}</div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Fair</span>
              <span className="font-mono text-sm tabular">
                {fmtEur(t.fairLow)}–{fmtEur(t.fairHigh)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
