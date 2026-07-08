import { createFileRoute, Link } from "@tanstack/react-router";
import { getArbitrageBoard } from "@/lib/api";
import { slugify } from "@/lib/format";

export const Route = createFileRoute("/similar/")({
  loader: async () => {
    const transfers = await getArbitrageBoard({ limit: 6 });
    return { transfers };
  },
  head: () => ({
    meta: [
      { title: "Similarity Map — MarketEdge" },
      { name: "description", content: "Find statistically similar players by performance profile. Toggle to see only cheaper alternatives." },
      { property: "og:title", content: "Similarity Map — MarketEdge" },
      { property: "og:description", content: "Style-space player similarity — find cheaper alternatives to any target." },
    ],
  }),
  component: SimilarIndex,
});

function SimilarIndex() {
  const { transfers } = Route.useLoaderData();

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-12">
      <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Section 05</div>
      <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Similarity Map</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        A style-space view of players similar to a chosen anchor. Axes are the two dominant performance dimensions for the position.
        Toggle "cheaper only" to use this as a find-a-cheaper-alternative tool.
      </p>

      <div className="mt-8">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Pick an anchor</div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {transfers.map((t) => (
            <Link key={t.id} to="/similar/$slug" params={{ slug: t.playerSlug }}
              className="rounded-sm border border-white/10 bg-card p-4 hover:border-white/25"
            >
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t.position} · {t.toLeague}
              </div>
              <div className="mt-2 font-display text-lg font-semibold">{t.playerName}</div>
              <div className="text-xs text-muted-foreground">{t.to} · T{t.leagueTier}</div>
            </Link>
          ))}
        </div>
        {transfers.length > 0 && (
          <div className="mt-8">
            <Link to="/similar/$slug" params={{ slug: slugify(transfers[0].playerName) }}
              className="inline-flex items-center gap-2 rounded-sm bg-[color:var(--edge-pos)] px-4 py-2 text-sm font-medium text-[color:var(--primary-foreground)]"
            >
              Try: {transfers[0].playerName.split(" ").pop()}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
