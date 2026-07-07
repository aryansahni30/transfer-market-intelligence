"use client";

import { useState, useCallback } from "react";
import { api, ArbitrageEntry, fmtEur } from "@/lib/api";
import ResidualBadge from "@/components/ResidualBadge";
import ConfidenceNote from "@/components/ConfidenceNote";
import Link from "next/link";

type Direction = "all" | "overpaid" | "underpaid";
const POSITIONS = ["", "GK", "Defender", "Midfielder", "Forward"];
const SEASONS = ["", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015"];

export default function ArbitrageBoardPage() {
  const [direction, setDirection] = useState<Direction>("all");
  const [position, setPosition] = useState("");
  const [season, setSeason] = useState("");
  const [leagueTier, setLeagueTier] = useState("");
  const [rows, setRows] = useState<ArbitrageEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getArbitrageBoard({
        direction,
        position: position || undefined,
        league_tier: leagueTier ? Number(leagueTier) : undefined,
        season: season ? Number(season) : undefined,
        limit: 50,
      });
      setRows(data);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [direction, position, season, leagueTier]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Arbitrage Board</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Ranked transfers where the model predicts the actual fee was significantly above or below fair value.
        <br />
        <strong style={{ color: "var(--accent-green)" }}>Undervalued</strong> = actual fee &lt; fair value ·{" "}
        <strong style={{ color: "var(--accent-red)" }}>Overvalued</strong> = actual fee &gt; fair value
      </p>

      {/* Filters */}
      <div
        className="rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: "var(--text-secondary)" }}>Direction</label>
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {(["all", "underpaid", "overpaid"] as Direction[]).map((d) => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className="px-3 py-1.5 text-xs capitalize transition-colors"
                style={{
                  background: direction === d ? "var(--accent-blue)" : "var(--surface2)",
                  color: direction === d ? "#fff" : "var(--text-secondary)",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <Select label="Position" value={position} onChange={setPosition} options={POSITIONS} placeholder="All" />
        <Select label="Season" value={season} onChange={setSeason} options={SEASONS} placeholder="All" />
        <Select
          label="League Tier"
          value={leagueTier}
          onChange={setLeagueTier}
          options={["", "1", "2", "3", "4"]}
          placeholder="All"
        />

        <button
          onClick={fetch}
          disabled={loading}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: "var(--accent-blue)", color: "#fff" }}
        >
          {loading ? "Loading…" : "Run"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm mb-4" style={{ background: "#2a1a1a", color: "var(--accent-red)", border: "1px solid #5a2020" }}>
          {error}
        </div>
      )}

      {!loaded && !loading && (
        <div className="rounded-xl p-12 text-center" style={{ border: "1px dashed var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Select filters and click Run to load the board</p>
        </div>
      )}

      {loaded && rows.length === 0 && (
        <p className="text-center py-8 text-sm" style={{ color: "var(--text-secondary)" }}>No results for selected filters.</p>
      )}

      {rows.length > 0 && (
        <>
          <div className="rounded-xl overflow-hidden mb-4" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                  {["#", "Player", "Position", "Age", "Club", "Season", "Fair Value", "Transfer Fee", "Arbitrage"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium text-xs" style={{ color: "var(--text-secondary)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={`${r.player_id}-${r.season}`}
                    className="transition-colors hover:opacity-90"
                    style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "var(--surface)" : "transparent" }}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium">
                      <Link href={`/?player=${r.player_id}`} className="hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>{r.position_group}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>{r.age}</td>
                    <td className="px-3 py-2.5 text-xs max-w-32 truncate" style={{ color: "var(--text-secondary)" }}>{r.club ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{r.season}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{fmtEur(r.predicted_fair_value)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{fmtEur(r.actual_fee)}</td>
                    <td className="px-3 py-2.5">
                      <ResidualBadge residual={r.arbitrage_residual} size="sm" />
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

interface SelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}

function Select({ label, value, onChange, options, placeholder }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg text-sm outline-none"
        style={{
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
      >
        <option value="">{placeholder}</option>
        {options.filter(Boolean).map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
