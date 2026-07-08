import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { getPlayerBySlug } from "@/lib/api";
import { SpreadBar } from "@/components/marketedge/SpreadBar";
import { DeltaChip } from "@/components/marketedge/DeltaChip";
import { ConfidenceBadge } from "@/components/marketedge/ConfidenceBadge";
import { fmtEur } from "@/lib/format";

export const Route = createFileRoute("/player/$slug")({
  loader: async ({ params }) => {
    const player = await getPlayerBySlug(params.slug).catch(() => {
      throw notFound();
    });
    return { player };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.player.name} — Fair value · MarketEdge` },
          { name: "description", content: `Model-predicted fair value ${fmtEur(loaderData.player.fairLow)}–${fmtEur(loaderData.player.fairHigh)} for ${loaderData.player.name} (${loaderData.player.club}).` },
          { property: "og:title", content: `${loaderData.player.name} — Fair value` },
          { property: "og:description", content: `Predicted fair value, market value and last transfer fee for ${loaderData.player.name}.` },
        ]
      : [{ title: "Player · MarketEdge" }, { name: "robots", content: "noindex" }],
  }),
  component: PlayerDetail,
  notFoundComponent: () => (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Player not found</div>
      <h1 className="mt-2 font-display text-3xl font-semibold">Not in the training set</h1>
      <Link to="/player" className="mt-6 inline-block text-sm text-[color:var(--edge-pos)]">← Back to search</Link>
    </main>
  ),
});

function PlayerDetail() {
  const { player } = Route.useLoaderData();
  const p = player;

  const domainMax = Math.max(
    p.fairHigh,
    p.marketValue,
    p.lastTransfer?.fee ?? 0,
  ) * 1.15 || 1;

  const overFair = (v: number) => v - p.fairMid;

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            {p.position} · {p.nationality} · foot {p.foot}
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="mt-2 font-display text-6xl font-semibold tracking-[-0.02em]"
          >
            {p.name}
          </motion.h1>
          <div className="mt-2 text-muted-foreground">
            <span className="text-foreground">{p.club}</span> · {p.league} · age <span className="tabular text-foreground">{p.age}</span>
          </div>
        </div>
        <div className="text-right">
          <ConfidenceBadge level={p.confidence} note={p.confidenceNote} />
          <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Fair value</div>
          <div className="font-display text-4xl font-semibold tabular">{fmtEur(p.fairMid)}</div>
          <div className="font-mono text-xs text-muted-foreground">
            range {fmtEur(p.fairLow)} – {fmtEur(p.fairHigh)}
          </div>
        </div>
      </div>

      {/* Valuation triptych */}
      <section className="mt-10 rounded-sm border border-white/10 bg-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Valuation</h2>
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-sm bg-[color:var(--edge-pos)]/40 ring-1 ring-[color:var(--edge-pos)]/60" />
              Fair range
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rotate-45 border border-white/70" />
              Market value
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--edge-neg)]" />
              Fee paid
            </span>
          </div>
        </div>

        <SpreadBar
          low={p.fairLow} mid={p.fairMid} high={p.fairHigh}
          domainMin={0} domainMax={domainMax}
          marketValue={p.marketValue}
          actualFee={p.lastTransfer?.fee}
        />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatBlock
            label="Fair value (mid)"
            value={fmtEur(p.fairMid)}
            sub={`${fmtEur(p.fairLow)} – ${fmtEur(p.fairHigh)}`}
          />
          <StatBlock
            label="Market value"
            value={fmtEur(p.marketValue)}
            sub="Transfermarkt-style current"
            delta={p.marketValue ? <DeltaChip value={overFair(p.marketValue)} /> : null}
          />
          {p.lastTransfer && (
            <StatBlock
              label={`Last fee (${p.lastTransfer.season})`}
              value={fmtEur(p.lastTransfer.fee)}
              sub={`${p.lastTransfer.from} → ${p.lastTransfer.to}`}
              delta={<DeltaChip value={overFair(p.lastTransfer.fee)} />}
            />
          )}
        </div>
      </section>

      {/* Drivers + confidence explanation */}
      <section className="mt-6 grid gap-6 md:grid-cols-[1.5fr_1fr]">
        <div className="rounded-sm border border-white/10 bg-card p-6">
          <h2 className="font-display text-lg font-semibold">What's driving this valuation</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Directional feature contributions, plain-language.
          </p>
          <ul className="mt-5 divide-y divide-white/5">
            {p.drivers.map((d: typeof p.drivers[number], i: number) => (
              <li key={i} className="flex items-start gap-4 py-3">
                <span
                  className={
                    "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm font-mono text-[11px] " +
                    (d.direction === "up"
                      ? "bg-[color:var(--edge-pos)]/15 text-[color:var(--edge-pos)]"
                      : "bg-[color:var(--edge-neg)]/15 text-[color:var(--edge-neg)]")
                  }
                >
                  {d.direction === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                </span>
                <div>
                  <div className="text-sm font-medium">{d.label}</div>
                  <div className="text-xs text-muted-foreground">{d.note}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-sm border border-white/10 bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Confidence</h2>
          <div className="mt-3">
            <ConfidenceBadge level={p.confidence} />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{p.confidenceNote}</p>
          <div className="mt-6 rounded-sm bg-white/[0.03] p-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            <div className="flex justify-between"><span>Model version</span><span>v0.4</span></div>
            <div className="mt-1.5 flex justify-between"><span>Hold-out MAE</span><span>±19%</span></div>
            <div className="mt-1.5 flex justify-between"><span>Sample size</span><span>{p.confidence === "high" ? "≥ 240 comps" : p.confidence === "mid" ? "80–240 comps" : "< 80 comps"}</span></div>
          </div>
        </div>
      </section>

      <section className="mt-8 flex items-center justify-between rounded-sm border border-white/10 bg-card p-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Related</div>
          <div className="font-display text-lg">Statistically similar players</div>
        </div>
        <Link to="/similar/$slug" params={{ slug: p.slug }}
          className="inline-flex items-center gap-2 rounded-sm border border-white/15 px-3 py-1.5 text-sm hover:bg-white/[0.04]"
        >
          Open similarity map <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </main>
  );
}

function StatBlock({ label, value, sub, delta }: { label: string; value: string; sub?: string; delta?: React.ReactNode }) {
  return (
    <div className="rounded-sm bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        {delta}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold tabular">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
