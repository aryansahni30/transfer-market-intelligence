import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { DeltaChip } from "@/components/marketedge/DeltaChip";
import { ConfidenceBadge } from "@/components/marketedge/ConfidenceBadge";
import { fmtEur } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MarketEdge — Predicted fair value vs. actual fee, across 15 years of transfers" },
      { name: "description", content: "Built on 1.89M appearances, 400K market-value snapshots and 80K transfer fees (2009–2024). See which transfers were steals, which were overpays, and where the market is mispricing today." },
      { property: "og:title", content: "MarketEdge — Football Transfer Intelligence" },
      { property: "og:description", content: "Model-predicted fair value vs. actual fees paid. The gap is the signal." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="mx-auto max-w-[1240px] px-6 py-20 md:py-28">
      {/* Hero */}
      <section className="grid gap-14 md:grid-cols-[1.1fr_1fr] md:gap-16">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground"
          >
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--edge-pos)] animate-pulse" />
            v0.4 · 2009–2024 dataset
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-5 font-display text-[56px] font-semibold leading-[1.0] tracking-[-0.03em] md:text-[76px]"
          >
            <span className="text-[color:var(--edge-pos)]">Fair value</span>
            {" "}vs.{" "}
            <span className="text-[color:var(--edge-neg)]">fee paid</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-6 max-w-lg text-[15px] leading-relaxed text-muted-foreground"
          >
            MarketEdge learns from 15 years of appearances, market values and real transfer fees to predict what
            a player <em>should</em> cost — as a range, not a single confident number.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link to="/arbitrage"
              className="group inline-flex items-center gap-2 rounded-sm bg-[color:var(--edge-pos)] px-4 py-2.5 text-sm font-medium text-[color:var(--primary-foreground)]"
            >
              Open arbitrage board
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link to="/player/$slug" params={{ slug: "neymar-jr" }}
              className="inline-flex items-center gap-2 rounded-sm border border-white/15 px-4 py-2.5 text-sm hover:bg-white/[0.04]"
            >
              Look up a player
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-10 flex flex-wrap gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground"
          >
            <span><span className="tabular text-foreground">1.89M</span> appearances</span>
            <span><span className="tabular text-foreground">400K</span> MV snapshots</span>
            <span><span className="tabular text-foreground">80K</span> transfer fees</span>
            <span>MAE <span className="tabular text-foreground">±19%</span></span>
          </motion.div>
        </div>

        {/* Demo panel */}
        <DemoPanel />
      </section>

      {/* The 4 surfaces */}
      <section className="mt-24 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <SurfaceCard num="02" title="Player Lookup" to="/player" desc="Fair-value range and drivers behind the number." i={0} />
        <SurfaceCard num="03" title="Arbitrage Board" to="/arbitrage" desc="Every real transfer ranked by fee-vs-fair gap." i={1} />
        <SurfaceCard num="04" title="Scout Assistant" to="/scout" desc="Budget + brief → candidates by value ratio." i={2} />
        <SurfaceCard num="05" title="Similarity Map" to="/similar" desc="Statistically similar players, cheaper filter on." i={3} />
      </section>

      <footer className="mt-24 flex items-center justify-between border-t border-white/5 pt-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>© MarketEdge — portfolio build</span>
        <span>Data 2009–2024 · Model v0.4</span>
      </footer>
    </main>
  );
}

/* -------------------- Demo panel with animated spread bar -------------------- */

const DEMO = {
  low: 62_000_000,
  mid: 77_000_000,
  high: 94_000_000,
  fee: 222_000_000,
  mv: 100_000_000,
  domain: 240_000_000,
};

function DemoPanel() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const pct = (v: number) => `${(v / DEMO.domain) * 100}%`;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.15 }}
      className="relative overflow-hidden rounded-sm border border-white/10 bg-[color:var(--pitch)] p-6"
    >
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>Neymar Jr — Santos → PSG · 2017/18</span>
        <ConfidenceBadge level="high" />
      </div>

      <div className="mt-8 space-y-1">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Fair value range</div>
        <CountUp value={DEMO.mid} inView={inView} className="font-display text-4xl font-semibold tabular tracking-tight text-[color:var(--edge-pos)]" prefix="€" suffix="M" divisor={1_000_000} />
        <div className="text-xs text-muted-foreground">
          band <span className="tabular text-foreground/80">{fmtEur(DEMO.low)}</span>–<span className="tabular text-foreground/80">{fmtEur(DEMO.high)}</span>
        </div>
      </div>

      {/* Animated spread bar */}
      <div className="mt-6">
        <div className="relative h-3 w-full rounded-sm bg-white/[0.04] ring-1 ring-inset ring-white/[0.06]">
          {/* fair range band */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={inView ? { scaleX: 1, opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-y-0 origin-left rounded-sm bg-[color:var(--edge-pos)]/25 ring-1 ring-[color:var(--edge-pos)]/40"
            style={{ left: pct(DEMO.low), width: `calc(${pct(DEMO.high)} - ${pct(DEMO.low)})` }}
          />
          {/* midpoint tick */}
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={inView ? { opacity: 1, scaleY: 1 } : {}}
            transition={{ duration: 0.3, delay: 0.9 }}
            className="absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-[color:var(--edge-pos)]"
            style={{ left: pct(DEMO.mid) }}
          />
          {/* MV diamond */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 1.05 }}
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/70 bg-transparent"
            style={{ left: pct(DEMO.mv) }}
          />
          {/* fee marker slides in from the mid, then lands at 222M */}
          <motion.div
            initial={{ left: pct(DEMO.mid), opacity: 0, scale: 0.4 }}
            animate={inView ? { left: pct(DEMO.fee), opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1.0, delay: 1.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--edge-neg)] ring-2 ring-background shadow-[0_0_20px_var(--edge-neg)]"
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <span>€0</span>
          <span>€240M</span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, delay: 2.1 }}
        className="mt-6 flex items-end justify-between border-t border-white/5 pt-5"
      >
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Fee paid</div>
          <CountUp value={DEMO.fee} inView={inView} delay={1.15} className="font-display text-3xl font-semibold tabular tracking-tight text-[color:var(--edge-neg)]" prefix="€" suffix="M" divisor={1_000_000} />
        </div>
        <DeltaChip value={DEMO.fee - DEMO.mid} />
      </motion.div>
    </motion.div>
  );
}

function CountUp({
  value, inView, className, prefix = "", suffix = "", divisor = 1, delay = 0.3,
}: {
  value: number; inView: boolean; className?: string;
  prefix?: string; suffix?: string; divisor?: number; delay?: number;
}) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => `${prefix}${Math.round(v / divisor)}${suffix}`);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] });
    const unsub = rounded.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return () => { controls.stop(); unsub(); };
  }, [inView, value, mv, rounded, delay]);

  return <div className={className}><span ref={ref}>{prefix}0{suffix}</span></div>;
}

function SurfaceCard({ num, title, to, desc, i }: { num: string; title: string; to: string; desc: string; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: i * 0.08 }}
    >
      <Link to={to}
        className="group block h-full rounded-sm border border-white/10 bg-card p-5 transition-all hover:border-white/25 hover:-translate-y-0.5"
      >
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{num}</span>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
        <div className="mt-3 font-display text-lg font-semibold">{title}</div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      </Link>
    </motion.div>
  );
}
