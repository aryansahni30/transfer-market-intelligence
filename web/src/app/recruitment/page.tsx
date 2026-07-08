"use client";

import { useState, useCallback } from "react";
import { api, RecruitmentCandidate, fmtEur } from "@/lib/api";
import ResidualBadge from "@/components/ResidualBadge";
import ConfidenceNote from "@/components/ConfidenceNote";
import ValueLedgerMark from "@/components/ValueLedgerMark";
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
      {/* Header */}
      <h1
        className="text-3xl mb-1"
        style={{ fontFamily: "var(--font-fraunces)", fontWeight: 600, color: "var(--parchment)" }}
      >
        Scout
      </h1>
      <p className="text-xs mb-8" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-public-sans)" }}>
        Enter your budget and requirements. Returns best-value targets ranked by{" "}
        <span style={{ color: "var(--verdigris)" }}>value ratio</span> (fair value ÷ asking price).
        Ratio &gt; 1.0 = model says player is worth more than you&apos;d pay.
      </p>

      {/* Form */}
      <div
        className="p-5 mb-6 grid grid-cols-2 md:grid-cols-3 gap-4"
        style={{ background: "var(--panel)", border: "1px solid var(--hairline)", borderRadius: "4px" }}
      >
        {/* Budget */}
        <div className="col-span-2 md:col-span-1">
          <label
            className="text-xs block mb-1.5"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)", letterSpacing: "0.06em" }}
          >
            BUDGET
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="flex-1 px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--ink)",
                border: "1px solid var(--hairline)",
                color: "var(--parchment)",
                borderRadius: "4px",
                fontFamily: "var(--font-ibm-plex-mono)",
              }}
            />
            <div className="flex overflow-hidden" style={{ border: "1px solid var(--hairline)", borderRadius: "4px" }}>
              {(["M", "K"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setBudgetUnit(u)}
                  className="px-3 py-2 text-xs transition-colors"
                  style={{
                    background: budgetUnit === u ? "var(--panel)" : "var(--ink)",
                    color: budgetUnit === u ? "var(--parchment)" : "var(--text-secondary)",
                    outline: budgetUnit === u ? "1px solid var(--gold)" : "none",
                    outlineOffset: "-1px",
                    fontFamily: "var(--font-ibm-plex-mono)",
                  }}
                >
                  €{u}
                </button>
              ))}
            </div>
          </div>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}
          >
            = {fmtEur(budgetEur)}
          </p>
        </div>

        {/* Position */}
        <div>
          <label
            className="text-xs block mb-1.5"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)", letterSpacing: "0.06em" }}
          >
            POSITION
          </label>
          <div className="grid grid-cols-2 gap-1">
            {POSITIONS.map((p) => (
              <button
                key={p}
                onClick={() => setPosition(p)}
                className="px-2 py-1.5 text-xs transition-colors"
                style={{
                  background: position === p ? "var(--panel)" : "var(--ink)",
                  color: position === p ? "var(--parchment)" : "var(--text-secondary)",
                  border: `1px solid ${position === p ? "var(--gold)" : "var(--hairline)"}`,
                  borderRadius: "4px",
                  fontFamily: "var(--font-ibm-plex-mono)",
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
            <label
              className="text-xs block mb-1.5"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)", letterSpacing: "0.06em" }}
            >
              AGE RANGE
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="15"
                max="45"
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                className="w-16 px-2 py-1.5 text-xs outline-none text-center"
                style={{
                  background: "var(--ink)",
                  border: "1px solid var(--hairline)",
                  color: "var(--parchment)",
                  borderRadius: "4px",
                  fontFamily: "var(--font-ibm-plex-mono)",
                }}
              />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>–</span>
              <input
                type="number"
                min="15"
                max="45"
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
                className="w-16 px-2 py-1.5 text-xs outline-none text-center"
                style={{
                  background: "var(--ink)",
                  border: "1px solid var(--hairline)",
                  color: "var(--parchment)",
                  borderRadius: "4px",
                  fontFamily: "var(--font-ibm-plex-mono)",
                }}
              />
            </div>
          </div>
          <div>
            <label
              className="text-xs block mb-1.5"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)", letterSpacing: "0.06em" }}
            >
              LEAGUE TIER
            </label>
            <select
              value={leagueTier}
              onChange={(e) => setLeagueTier(e.target.value)}
              className="w-full px-2 py-1.5 text-xs outline-none"
              style={{
                background: "var(--ink)",
                border: "1px solid var(--hairline)",
                color: "var(--parchment)",
                borderRadius: "4px",
                fontFamily: "var(--font-ibm-plex-mono)",
              }}
            >
              <option value="">ALL TIERS</option>
              {[1, 2, 3, 4].map((t) => (
                <option key={t} value={t}>TIER {t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="col-span-2 md:col-span-3 flex justify-end">
          <button
            onClick={search}
            disabled={loading || !budget}
            className="px-6 py-2 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{
              background: "var(--gold)",
              color: "var(--ink)",
              borderRadius: "4px",
              fontFamily: "var(--font-ibm-plex-mono)",
              letterSpacing: "0.06em",
            }}
          >
            {loading ? "SEARCHING…" : "FIND TARGETS"}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="px-4 py-3 text-xs mb-4"
          style={{ background: "#1E1212", color: "var(--brick)", border: "1px solid #4A2020", borderRadius: "4px" }}
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loaded && !loading && (
        <div
          className="flex items-center gap-6 px-6 py-8"
          style={{ border: "1px solid var(--hairline)", borderRadius: "4px" }}
        >
          <div className="flex-1">
            <ValueLedgerMark predicted={undefined} actual={undefined} dormant />
          </div>
          <p className="text-xs shrink-0" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}>
            SET BUDGET AND POSITION, THEN CLICK FIND TARGETS
          </p>
        </div>
      )}

      {loaded && candidates.length === 0 && (
        <div
          className="flex items-center gap-6 px-6 py-8"
          style={{ border: "1px solid var(--hairline)", borderRadius: "4px" }}
        >
          <div className="flex-1">
            <ValueLedgerMark predicted={undefined} actual={undefined} dormant />
          </div>
          <p className="text-xs shrink-0" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}>
            NO CANDIDATES FOUND — TRY INCREASING BUDGET OR RELAXING FILTERS
          </p>
        </div>
      )}

      {candidates.length > 0 && (
        <>
          <p
            className="text-xs mb-2"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}
          >
            {candidates.length} CANDIDATES WITHIN {fmtEur(budgetEur)} · {position.toUpperCase()} · AGE {minAge}–{maxAge}
          </p>
          <div className="mb-4 overflow-hidden" style={{ border: "1px solid var(--hairline)", borderRadius: "4px" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--ink)", borderBottom: "1px solid var(--hairline)" }}>
                  {["#", "Player", "Age", "Club", "Fair Value", "Asking Price", "Value Mark", "Ratio", "Arbitrage"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left font-medium"
                      style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)", letterSpacing: "0.06em" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr
                    key={c.player_id}
                    className="transition-opacity hover:opacity-80"
                    style={{ borderBottom: "1px solid var(--hairline)", background: i % 2 === 0 ? "var(--panel)" : "transparent" }}
                  >
                    <td className="px-3 py-2.5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                      {i + 1}
                    </td>
                    <td className="px-3 py-2.5 font-medium">
                      <Link
                        href={`/similarity?player_id=${c.player_id}&name=${encodeURIComponent(c.name)}`}
                        className="hover:underline"
                        style={{ color: "var(--parchment)" }}
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}>{c.age}</td>
                    <td className="px-3 py-2.5 max-w-28 truncate" style={{ color: "var(--text-secondary)" }}>{c.club ?? "—"}</td>
                    <td className="px-3 py-2.5" style={{ fontFamily: "var(--font-ibm-plex-mono)", fontVariantNumeric: "tabular-nums", color: "var(--parchment)" }}>
                      {fmtEur(c.predicted_fair_value)}
                    </td>
                    <td className="px-3 py-2.5" style={{ fontFamily: "var(--font-ibm-plex-mono)", fontVariantNumeric: "tabular-nums", color: "var(--parchment)" }}>
                      {fmtEur(c.asking_price)}
                    </td>
                    <td className="px-3 py-2.5" style={{ minWidth: "120px" }}>
                      <ValueLedgerMark
                        predicted={c.predicted_fair_value}
                        actual={c.asking_price}
                        variant="static"
                      />
                    </td>
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
      className="text-xs font-semibold"
      style={{
        color: good ? "var(--verdigris)" : "var(--brick)",
        fontFamily: "var(--font-ibm-plex-mono)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {ratio.toFixed(2)}×
    </span>
  );
}
