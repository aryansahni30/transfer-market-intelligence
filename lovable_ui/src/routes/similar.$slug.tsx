import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { getSimilarBySlug } from "@/lib/api";
import { SimilarityMap } from "@/components/marketedge/SimilarityMap";
import { fmtEur } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/similar/$slug")({
  loader: async ({ params }) => {
    const entry = await getSimilarBySlug(params.slug).catch(() => {
      throw notFound();
    });
    return { entry };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `Players similar to ${loaderData.entry.anchor.name} — MarketEdge` },
          { name: "description", content: `Statistically similar players to ${loaderData.entry.anchor.name} — with an option to filter to only cheaper alternatives.` },
          { property: "og:title", content: `Similar to ${loaderData.entry.anchor.name}` },
          { property: "og:description", content: `Style-space neighbors and cheaper alternatives to ${loaderData.entry.anchor.name}.` },
        ]
      : [{ title: "Similarity · MarketEdge" }, { name: "robots", content: "noindex" }],
  }),
  component: SimilarDetail,
  notFoundComponent: () => (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Not modelled</div>
      <h1 className="mt-2 font-display text-3xl font-semibold">No similarity data for that player</h1>
      <Link to="/similar" className="mt-6 inline-block text-sm text-[color:var(--edge-pos)]">← Pick another anchor</Link>
    </main>
  ),
});

function SimilarDetail() {
  const { entry } = Route.useLoaderData();
  const { anchor, nodes } = entry;
  const [cheaperOnly, setCheaperOnly] = useState(false);

  const list = [...nodes].sort((a, b) => b.similarity - a.similarity);
  const visibleList = cheaperOnly ? list.filter((n) => n.marketValue < anchor.marketValue) : list;

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Section 05</div>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
            Similar to <span className="text-[color:var(--edge-neg)]">{anchor.name}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Points show style-space neighbors. Size = last-season minutes; color intensity = similarity score.
            Click any node to open that player's lookup.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={cheaperOnly} onChange={(e) => setCheaperOnly(e.target.checked)}
            className="h-3.5 w-3.5 accent-[color:var(--edge-pos)]" />
          Cheaper than {anchor.name.split(" ").pop()} only
        </label>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-sm border border-white/10 bg-card p-5">
          <SimilarityMap anchor={anchor} nodes={nodes} cheaperOnly={cheaperOnly} />
        </div>

        <div className="rounded-sm border border-white/10 bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="font-display text-lg font-semibold">Top matches</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {visibleList.length} shown
            </div>
          </div>
          <ul className="mt-3 divide-y divide-white/5">
            {visibleList.map((n) => {
              const cheaper = n.marketValue < anchor.marketValue;
              return (
                <li key={n.slug}>
                  <Link to="/player/$slug" params={{ slug: n.slug }}
                    className="flex items-center gap-3 py-2.5 hover:bg-white/[0.02]"
                  >
                    <div className="w-10 shrink-0 font-mono text-[11px] tabular text-muted-foreground">
                      {(n.similarity * 100).toFixed(0)}%
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{n.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{n.club} · age {n.age}</div>
                    </div>
                    <div className={cn(
                      "font-mono text-xs tabular",
                      cheaper ? "text-[color:var(--edge-pos)]" : "text-muted-foreground",
                    )}>
                      {fmtEur(n.marketValue)}
                    </div>
                  </Link>
                </li>
              );
            })}
            {visibleList.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                No cheaper alternatives in the current neighborhood.
              </li>
            )}
          </ul>
        </div>
      </div>
    </main>
  );
}
