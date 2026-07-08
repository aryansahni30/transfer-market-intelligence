import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { getArbitrageBoard } from "@/lib/api";
import { transferDelta, transferDeltaPct, type TransferRow } from "@/lib/mock/transfers";
import { SpreadBar } from "@/components/marketedge/SpreadBar";
import { DeltaChip } from "@/components/marketedge/DeltaChip";
import { ConfidenceBadge } from "@/components/marketedge/ConfidenceBadge";
import { fmtEur, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Position } from "@/lib/mock/players";
import type { Confidence } from "@/lib/mock/players";

export const Route = createFileRoute("/arbitrage")({
  loader: async () => {
    const transfers = await getArbitrageBoard({ limit: 200 });
    return { transfers };
  },
  head: () => ({
    meta: [
      { title: "Arbitrage Board — MarketEdge" },
      {
        name: "description",
        content:
          "Every transfer ranked by how far the actual fee sat from the model's fair-value estimate. Filter by direction, position, season, and confidence.",
      },
      { property: "og:title", content: "Arbitrage Board — MarketEdge" },
      {
        property: "og:description",
        content: "The biggest steals and overpays in football, ranked by model fair-value delta.",
      },
    ],
  }),
  component: Arbitrage,
});

type Direction = "all" | "over" | "under";
const positions: Position[] = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];
const tiers = [1, 2, 3] as const;

function Arbitrage() {
  const { transfers } = Route.useLoaderData();
  const [direction, setDirection] = useState<Direction>("all");
  const [position, setPosition] = useState<Position | "all">("all");
  const [tier, setTier] = useState<1 | 2 | 3 | "all">("all");
  const [seasonFrom, setSeasonFrom] = useState<string>("all");
  const [highConfOnly, setHighConfOnly] = useState(false);
  const [sortKey, setSortKey] = useState<"deltaAbs" | "deltaPct" | "season" | "fee">("deltaAbs");

  const seasons = useMemo(
    () => Array.from(new Set(transfers.map((t) => t.season))).sort(),
    [transfers],
  );

  const filtered = useMemo(() => {
    let rows = transfers.slice();
    if (direction !== "all") {
      rows = rows.filter((t) =>
        direction === "over" ? transferDelta(t) > 0 : transferDelta(t) < 0,
      );
    }
    if (position !== "all") rows = rows.filter((t) => t.position === position);
    if (tier !== "all") rows = rows.filter((t) => t.leagueTier === tier);
    if (seasonFrom !== "all") rows = rows.filter((t) => t.season >= seasonFrom);
    if (highConfOnly) rows = rows.filter((t) => t.confidence === "high");

    rows.sort((a, b) => {
      switch (sortKey) {
        case "deltaAbs":
          return Math.abs(transferDelta(b)) - Math.abs(transferDelta(a));
        case "deltaPct":
          return Math.abs(transferDeltaPct(b)) - Math.abs(transferDeltaPct(a));
        case "season":
          return b.season.localeCompare(a.season);
        case "fee":
          return b.fee - a.fee;
      }
    });
    return rows;
  }, [transfers, direction, position, tier, seasonFrom, highConfOnly, sortKey]);

  const summary = useMemo(() => {
    const over = filtered.filter((t) => transferDelta(t) > 0);
    const under = filtered.filter((t) => transferDelta(t) < 0);
    const totalOver = over.reduce((s, t) => s + transferDelta(t), 0);
    const totalUnder = under.reduce((s, t) => s + transferDelta(t), 0);
    return { over: over.length, under: under.length, totalOver, totalUnder };
  }, [filtered]);

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            Section 03
          </div>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
            Arbitrage Board
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every transfer in the sample, ranked by the gap between the actual fee paid and the
            model's fair-value midpoint.
            <span className="text-[color:var(--edge-neg)]"> Overpaid</span> in red;{" "}
            <span className="text-[color:var(--edge-pos)]">underpaid</span> in lime.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-right">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Overpaid
            </div>
            <div className="font-display text-2xl font-semibold tabular text-[color:var(--edge-neg)]">
              {summary.over}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {fmtEur(summary.totalOver, { sign: true })}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Underpaid
            </div>
            <div className="font-display text-2xl font-semibold tabular text-[color:var(--edge-pos)]">
              {summary.under}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {fmtEur(summary.totalUnder, { sign: true })}
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mt-6 rounded-sm border border-white/10 bg-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <FilterGroup label="Direction">
            {(["all", "over", "under"] as Direction[]).map((d) => (
              <Chip key={d} active={direction === d} onClick={() => setDirection(d)}>
                {d === "all" ? "All" : d === "over" ? "Overpaid" : "Underpaid"}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label="Position">
            <Chip active={position === "all"} onClick={() => setPosition("all")}>
              All
            </Chip>
            {positions.map((p) => (
              <Chip key={p} active={position === p} onClick={() => setPosition(p)}>
                {p}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label="League tier">
            <Chip active={tier === "all"} onClick={() => setTier("all")}>
              All
            </Chip>
            {tiers.map((t) => (
              <Chip key={t} active={tier === t} onClick={() => setTier(t)}>
                T{t}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label="Since">
            <select
              value={seasonFrom}
              onChange={(e) => setSeasonFrom(e.target.value)}
              className="rounded-sm border border-white/15 bg-transparent px-2 py-1 font-mono text-xs"
            >
              <option value="all">Any season</option>
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FilterGroup>

          <FilterGroup label="Sort">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
              className="rounded-sm border border-white/15 bg-transparent px-2 py-1 font-mono text-xs"
            >
              <option value="deltaAbs">|Δ €| largest</option>
              <option value="deltaPct">|Δ %| largest</option>
              <option value="season">Newest season</option>
              <option value="fee">Highest fee</option>
            </select>
          </FilterGroup>

          <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={highConfOnly}
              onChange={(e) => setHighConfOnly(e.target.checked)}
              className="h-3.5 w-3.5 accent-[color:var(--edge-pos)]"
            />
            High confidence only
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-sm border border-white/10">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-white/[0.03]">
            <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-2.5">Player</th>
              <th className="px-4 py-2.5">Move</th>
              <th className="px-4 py-2.5">Season</th>
              <th className="px-4 py-2.5 text-right">Fee</th>
              <th className="px-4 py-2.5">Fair range</th>
              <th className="px-4 py-2.5 text-right">Δ €</th>
              <th className="px-4 py-2.5 text-right">Δ %</th>
              <th className="px-4 py-2.5">Conf.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, idx) => (
              <TransferRowUI key={t.id} t={t} idx={idx} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No transfers match these filters.
          </div>
        )}
      </div>
    </main>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-sm border px-2 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors",
        active
          ? "border-[color:var(--edge-pos)] bg-[color:var(--edge-pos)]/15 text-[color:var(--edge-pos)]"
          : "border-white/10 bg-transparent text-muted-foreground hover:border-white/25 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function TransferRowUI({ t, idx }: { t: TransferRow; idx: number }) {
  const delta = transferDelta(t);
  const dpct = transferDeltaPct(t);
  const overpaid = delta > 0;
  const intensity = Math.min(0.24, Math.max(0.04, Math.abs(dpct) * 0.12));
  const bg = overpaid
    ? `color-mix(in oklab, var(--edge-neg) ${intensity * 100}%, transparent)`
    : `color-mix(in oklab, var(--edge-pos) ${intensity * 100}%, transparent)`;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.01 }}
      className="border-t border-white/5 hover:bg-white/[0.03]"
      style={{ backgroundColor: bg }}
    >
      <td className="px-4 py-3">
        <Link
          to="/player/$slug"
          params={{ slug: t.playerSlug }}
          className="group inline-flex items-center gap-1.5 font-medium hover:text-[color:var(--edge-pos)]"
        >
          {t.playerName}
          <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {t.position}
        </div>
      </td>
      <td className="px-4 py-3 text-xs">
        <div className="text-foreground">{t.from}</div>
        <div className="text-muted-foreground">→ {t.to}</div>
      </td>
      <td className="px-4 py-3 font-mono text-xs tabular text-muted-foreground">{t.season}</td>
      <td className="px-4 py-3 text-right font-mono tabular">{fmtEur(t.fee)}</td>
      <td className="px-4 py-3 w-64">
        <SpreadBar
          low={t.fairLow}
          mid={t.fairMid}
          high={t.fairHigh}
          domainMin={0}
          domainMax={Math.max(t.fairHigh, t.fee) * 1.1}
          actualFee={t.fee}
          showLabels={false}
          compact
        />
        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
          {fmtEur(t.fairLow)}–{fmtEur(t.fairHigh)}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <DeltaChip value={delta} />
      </td>
      <td
        className={cn(
          "px-4 py-3 text-right font-mono tabular",
          overpaid ? "text-[color:var(--edge-neg)]" : "text-[color:var(--edge-pos)]",
        )}
      >
        {pct(dpct)}
      </td>
      <td className="px-4 py-3">
        <ConfidenceBadge level={t.confidence as Confidence} />
      </td>
    </motion.tr>
  );
}
