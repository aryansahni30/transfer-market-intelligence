import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { getRecruitmentCandidates } from "@/lib/api";
import { SpreadBar } from "@/components/marketedge/SpreadBar";
import { ConfidenceBadge } from "@/components/marketedge/ConfidenceBadge";
import { PitchPositionPicker } from "@/components/marketedge/PitchPositionPicker";
import { fmtEur } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Position } from "@/lib/mock/players";
import type { ScoutCandidate } from "@/lib/mock/scoutPool";

export const Route = createFileRoute("/scout")({
  head: () => ({
    meta: [
      { title: "Scout Assistant — MarketEdge" },
      {
        name: "description",
        content:
          "Set a budget, a position and an age range. Get players ranked by fair-value-to-asking-price ratio with a plain-language reason for each shortlist entry.",
      },
      { property: "og:title", content: "Scout Assistant — MarketEdge" },
      {
        property: "og:description",
        content: "A recruitment shortlist tool ranked by value ratio, not by biggest name.",
      },
    ],
  }),
  component: Scout,
});

const tiers = [1, 2, 3] as const;

const POSITION_GROUP: Record<string, string> = {
  GK: "GK",
  CB: "Defender",
  LB: "Defender",
  RB: "Defender",
  CDM: "Midfielder",
  CM: "Midfielder",
  CAM: "Midfielder",
  LW: "Forward",
  RW: "Forward",
  ST: "Forward",
};

function Scout() {
  const [budget, setBudget] = useState(45);
  const [position, setPosition] = useState<Position | null>("CB");
  const [ageMin, setAgeMin] = useState(21);
  const [ageMax, setAgeMax] = useState(26);
  const [selectedTiers, setSelectedTiers] = useState<Set<number>>(new Set([1, 2, 3]));
  const [results, setResults] = useState<ScoutCandidate[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const budgetE = budget * 1_000_000;
      getRecruitmentCandidates({
        budget: budgetE,
        position,
        ageMin,
        ageMax,
      })
        .then((candidates) => {
          const filtered = candidates
            .filter((c) => c.askingPrice <= budgetE * 1.15)
            .filter((c) =>
              position ? POSITION_GROUP[c.position] === POSITION_GROUP[position] : true,
            )
            .filter((c) => c.age >= ageMin && c.age <= ageMax)
            .filter((c) => selectedTiers.has(c.leagueTier))
            .sort((a, b) => b.ratio - a.ratio);
          setResults(filtered);
        })
        .catch(() => setResults([]));
    }, 400);
    return () => clearTimeout(timer);
  }, [budget, position, ageMin, ageMax, selectedTiers]);

  const toggleTier = (t: number) => {
    const s = new Set(selectedTiers);
    if (s.has(t)) s.delete(t);
    else s.add(t);
    setSelectedTiers(s);
  };

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        Section 04
      </div>
      <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">Scout Assistant</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        A shortlist tool for recruitment. Ranked by{" "}
        <span className="text-foreground">fair-value-to-asking-price ratio</span> — the best value
        for your money, not the most expensive names.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Brief form */}
        <aside className="rounded-sm border border-white/10 bg-card p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Brief
          </div>

          {/* Budget */}
          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <label className="text-sm font-medium">Budget</label>
              <span className="font-mono tabular text-lg">€{budget}M</span>
            </div>
            <input
              type="range"
              min={5}
              max={200}
              step={5}
              value={budget}
              onChange={(e) => setBudget(+e.target.value)}
              className="mt-2 w-full accent-[color:var(--edge-pos)]"
            />
            <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>€5M</span>
              <span>€200M</span>
            </div>
          </div>

          {/* Position (pitch) */}
          <div className="mt-6">
            <div className="flex items-baseline justify-between">
              <label className="text-sm font-medium">Position</label>
              <span className="font-mono text-xs text-muted-foreground">{position ?? "any"}</span>
            </div>
            <div className="mt-2">
              <PitchPositionPicker value={position} onChange={setPosition} />
            </div>
          </div>

          {/* Age */}
          <div className="mt-6">
            <div className="flex items-baseline justify-between">
              <label className="text-sm font-medium">Age range</label>
              <span className="font-mono tabular text-sm">
                {ageMin} – {ageMax}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="number"
                min={16}
                max={40}
                value={ageMin}
                onChange={(e) => setAgeMin(+e.target.value)}
                className="rounded-sm border border-white/15 bg-transparent px-2 py-1.5 font-mono text-sm"
              />
              <input
                type="number"
                min={16}
                max={40}
                value={ageMax}
                onChange={(e) => setAgeMax(+e.target.value)}
                className="rounded-sm border border-white/15 bg-transparent px-2 py-1.5 font-mono text-sm"
              />
            </div>
          </div>

          {/* League tier */}
          <div className="mt-6">
            <label className="text-sm font-medium">League tier</label>
            <div className="mt-2 flex gap-2">
              {tiers.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTier(t)}
                  className={cn(
                    "rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide",
                    selectedTiers.has(t)
                      ? "border-[color:var(--edge-pos)] bg-[color:var(--edge-pos)]/15 text-[color:var(--edge-pos)]"
                      : "border-white/10 text-muted-foreground hover:border-white/25",
                  )}
                >
                  Tier {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-sm bg-white/[0.03] p-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <div className="flex justify-between">
              <span>Ranking</span>
              <span>Fair mid / asking</span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span>Budget headroom</span>
              <span>+15%</span>
            </div>
          </div>
        </aside>

        {/* Results */}
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <div className="font-display text-lg">
              {results.length} <span className="text-muted-foreground">candidates</span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Sorted by fair-value ratio ↓
            </div>
          </div>

          {results.length === 0 ? (
            <div className="rounded-sm border border-dashed border-white/15 p-10 text-center text-sm text-muted-foreground">
              No candidates match this brief. Try widening the age range, adding a tier, or raising
              the budget.
            </div>
          ) : (
            <ul className="grid gap-3">
              {results.map((c, i) => (
                <motion.li
                  key={c.slug}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    to="/player/$slug"
                    params={{ slug: c.slug }}
                    className="group grid gap-4 rounded-sm border border-white/10 bg-card p-4 transition-colors hover:border-white/25 md:grid-cols-[1.4fr_1fr_auto] md:items-center"
                  >
                    {/* identity */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg font-semibold">{c.name}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.club} · {c.position} · age {c.age} · T{c.leagueTier}
                      </div>
                      <p className="mt-2 text-sm leading-snug text-muted-foreground">{c.reason}</p>
                    </div>

                    {/* spread */}
                    <div>
                      <SpreadBar
                        low={c.fairLow}
                        mid={c.fairMid}
                        high={c.fairHigh}
                        domainMin={0}
                        domainMax={Math.max(c.fairHigh, c.askingPrice) * 1.15}
                        marketValue={c.askingPrice}
                        showLabels={false}
                      />
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Asking{" "}
                          <span className="tabular text-foreground">{fmtEur(c.askingPrice)}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Fair <span className="tabular text-foreground">{fmtEur(c.fairMid)}</span>
                        </span>
                      </div>
                    </div>

                    {/* ratio */}
                    <div className="text-right">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Ratio
                      </div>
                      <div
                        className={cn(
                          "font-display text-3xl font-semibold tabular",
                          c.ratio >= 1.5 ? "text-[color:var(--edge-pos)]" : "text-foreground",
                        )}
                      >
                        {c.ratio.toFixed(2)}×
                      </div>
                      <div className="mt-2">
                        <ConfidenceBadge level={c.confidence} />
                      </div>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
