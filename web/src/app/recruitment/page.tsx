"use client";

import { useState, useCallback } from "react";
import { api, RecruitmentCandidate, fmtEur } from "@/lib/api";
import ResidualBadge from "@/components/ResidualBadge";
import ConfidenceNote from "@/components/ConfidenceNote";
import Link from "next/link";

const POSITIONS = ["GK", "Defender", "Midfielder", "Forward"];

export default function RecruitmentPage() {
  const [budget, setBudget] = useState("30");
  const [budgetUnit, setBudgetUnit] = useState<"M" | "K">("M");
  const [position, setPosition] = useState("Forward");
  const [minAge, setMinAge] = useState("18");
  const [maxAge, setMaxAge] = useState("28");
  const [leagueTier, setLeagueTier] = useState("");
  const [candidates, setCandidates] = useState<RecruitmentCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const budgetEur = Number(budget) * (budgetUnit === "M" ? 1_000_000 : 1_000);

  const search = useCallback(async () => {
    if (!budget || !position) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRecruitmentCandidates({
        budget: budgetEur,
        position,
        min_age: Number(minAge),
        max_age: Number(maxAge),
        league_tier: leagueTier ? Number(leagueTier) : undefined,
        limit: 30,
      });
      setCandidates(data);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [budget, budgetUnit, position, minAge, maxAge, leagueTier, budgetEur]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Recruitment Assistant</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Enter your budget and requirements. Returns the best-value targets ranked by{" "}
        <strong>value ratio</strong> (fair value ÷ asking price). Ratio &gt; 1.0 = model says player is worth
        more than you'd pay.
      </p>

      {/* Form */}
      <div
        className="rounded-xl p-5 mb-6 grid grid-cols-2 md:grid-cols-3 gap-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Budget */}
        <div className="col-span-2 md:col-span-1">
          <label className="text-xs block mb-1" style={{ color: "var(--text-secondary)" }}>Budget</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {(["M", "K"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setBudgetUnit(u)}
                  className="px-3 py-2 text-xs"
                  style={{
                    background: budgetUnit === u ? "var(--accent-blue)" : "var(--surface2)",
                    color: budgetUnit === u ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  €{u}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>= {fmtEur(budgetEur)}</p>
        </div>

        {/* Position */}
        <div>
          <label className="text-xs block mb-1" style={{ color: "var(--text-secondary)" }}>Position</label>
          <div className="grid grid-cols-2 gap-1">
            {POSITIONS.map((p) => (
              <button
                key={p}
                onClick={() => setPosition(p)}
                className="px-2 py-1.5 rounded text-xs"
                style={{
                  background: position === p ? "var(--accent-blue)" : "var(--surface2)",
                  color: position === p ? "#fff" : "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Age + Tier */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-secondary)" }}>Age range</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="15"
                max="45"
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                className="w-16 px-2 py-1.5 rounded text-xs outline-none text-center"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>–</span>
              <input
                type="number"
                min="15"
                max="45"
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
                className="w-16 px-2 py-1.5 rounded text-xs outline-none text-center"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-secondary)" }}>League Tier (optional)</label>
            <select
              value={leagueTier}
              onChange={(e) => setLeagueTier(e.target.value)}
              className="w-full px-2 py-1.5 rounded text-xs outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              <option value="">All tiers</option>
              {[1, 2, 3, 4].map((t) => (
                <option key={t} value={t}>Tier {t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="col-span-2 md:col-span-3 flex justify-end">
          <button
            onClick={search}
            disabled={loading || !budget}
            className="px-6 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: "var(--accent-blue)", color: "#fff" }}
          >
            {loading ? "Searching…" : "Find Targets"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm mb-4" style={{ background: "#2a1a1a", color: "var(--accent-red)", border: "1px solid #5a2020" }}>
          {error}
        </div>
      )}

      {!loaded && !loading && (
        <div className="rounded-xl p-12 text-center" style={{ border: "1px dashed var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Set your budget and position, then click Find Targets</p>
        </div>
      )}

      {loaded && candidates.length === 0 && (
        <p className="text-center py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
          No candidates found within budget. Try increasing budget or relaxing age/tier filters.
        </p>
      )}

      {candidates.length > 0 && (
        <>
          <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
            {candidates.length} candidates within {fmtEur(budgetEur)} · {position} · Age {minAge}–{maxAge}
          </p>
          <div className="rounded-xl overflow-hidden mb-4" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                  {["#", "Player", "Age", "Club", "Fair Value", "Asking Price", "Value Ratio", "Arbitrage"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium text-xs" style={{ color: "var(--text-secondary)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr
                    key={c.player_id}
                    className="transition-colors hover:opacity-90"
                    style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "var(--surface)" : "transparent" }}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium">
                      <Link
                        href={`/similarity?player_id=${c.player_id}&name=${encodeURIComponent(c.name)}`}
                        className="hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>{c.age}</td>
                    <td className="px-3 py-2.5 text-xs max-w-28 truncate" style={{ color: "var(--text-secondary)" }}>{c.club ?? "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{fmtEur(c.predicted_fair_value)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{fmtEur(c.asking_price)}</td>
                    <td className="px-3 py-2.5">
                      <ValueRatioBadge ratio={c.value_ratio} />
                    </td>
                    <td className="px-3 py-2.5">
                      <ResidualBadge residual={c.arbitrage_residual} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ConfidenceNote />
        </>
      )}
    </div>
  );
}

function ValueRatioBadge({ ratio }: { ratio: number | null }) {
  if (ratio == null) return <span style={{ color: "var(--text-secondary)" }}>—</span>;
  const good = ratio >= 1.0;
  return (
    <span
      className="font-mono text-xs font-semibold"
      style={{ color: good ? "var(--accent-green)" : "var(--accent-red)" }}
    >
      {ratio.toFixed(2)}×
    </span>
  );
}
