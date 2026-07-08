"use client";

import { useState, useCallback, useMemo } from "react";
import { api, ArbitrageEntry, fmtEur } from "@/lib/api";
import ResidualBadge from "@/components/ResidualBadge";
import ConfidenceNote from "@/components/ConfidenceNote";
import ValueLedgerMark from "@/components/ValueLedgerMark";
import Link from "next/link";

type Direction = "all" | "overpaid" | "underpaid";
const POSITIONS = ["", "GK", "Defender", "Midfielder", "Forward"];
const SEASONS = ["", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015"];

const HIGH_CONF_THRESHOLD = 5_000_000; // |residual| > €5M proxy for bootstrap-stable entries

export default function ArbitrageBoardPage() {
  const [direction, setDirection] = useState<Direction>("all");
  const [position, setPosition] = useState("");
  const [season, setSeason] = useState("");
  const [leagueTier, setLeagueTier] = useState("");
  const [highConfOnly, setHighConfOnly] = useState(true);
  const [rows, setRows] = useState<ArbitrageEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fetchBoard = useCallback(async () => {
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

  const displayRows = useMemo(() => {
    if (!highConfOnly) return rows;
    return rows.filter((r) => Math.abs(r.arbitrage_residual ?? 0) > HIGH_CONF_THRESHOLD);
  }, [rows, highConfOnly]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <h1
        className="text-3xl mb-1"
        style={{ fontFamily: "var(--font-fraunces)", fontWeight: 600, color: "var(--parchment)" }}
      >
        Arbitrage Board
      </h1>
      <p className="text-xs mb-8" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-public-sans)" }}>
        Ranked transfers where the model predicts the actual fee was significantly above or below fair value.
        {" "}<span style={{ color: "var(--verdigris)" }}>Undervalued</span> = actual fee &lt; fair value ·{" "}
        <span style={{ color: "var(--brick)" }}>Overvalued</span> = actual fee &gt; fair value
      </p>

      {/* Filters */}
      <div
        className="p-4 mb-6 flex flex-wrap gap-4 items-end"
        style={{ background: "var(--panel)", border: "1px solid var(--hairline)", borderRadius: "4px" }}
      >
        {/* Direction toggle */}
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)", letterSpacing: "0.06em" }}
          >
            DIRECTION
          </label>
          <div className="flex overflow-hidden" style={{ border: "1px solid var(--hairline)", borderRadius: "4px" }}>
            {(["all", "underpaid", "overpaid"] as Direction[]).map((d) => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className="px-3 py-1.5 text-xs capitalize transition-colors"
                style={{
                  background: direction === d ? "var(--panel)" : "var(--ink)",
                  color: direction === d ? "var(--parchment)" : "var(--text-secondary)",
                  borderRight: "1px solid var(--hairline)",
                  outline: direction === d ? "1px solid var(--gold)" : "none",
                  outlineOffset: "-1px",
                  fontFamily: "var(--font-ibm-plex-mono)",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <Select label="POSITION" value={position} onChange={setPosition} options={POSITIONS} placeholder="All" />
        <Select label="SEASON" value={season} onChange={setSeason} options={SEASONS} placeholder="All" />
        <Select
          label="LEAGUE TIER"
          value={leagueTier}
          onChange={setLeagueTier}
          options={["", "1", "2", "3", "4"]}
          placeholder="All"
        />

        {/* High confidence toggle */}
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)", letterSpacing: "0.06em" }}
          >
            HIGH CONFIDENCE
          </label>
          <button
            onClick={() => setHighConfOnly((v) => !v)}
            className="relative w-10 h-5 transition-colors"
            style={{
              background: highConfOnly ? "var(--gold)" : "var(--ink)",
              border: `1px solid ${highConfOnly ? "var(--gold)" : "var(--hairline)"}`,
              borderRadius: "10px",
            }}
            aria-pressed={highConfOnly}
            title="|residual| > €5M"
          >
            <span
              className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform"
              style={{
                background: highConfOnly ? "var(--ink)" : "var(--hairline)",
                transform: highConfOnly ? "translateX(20px)" : "translateX(0)",
              }}
            />
          </button>
        </div>

        {/* Run button */}
        <button
          onClick={fetchBoard}
          disabled={loading}
          className="px-5 py-2 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{
            background: "var(--gold)",
            color: "var(--ink)",
            borderRadius: "4px",
            fontFamily: "var(--font-ibm-plex-mono)",
            letterSpacing: "0.06em",
          }}
        >
          {loading ? "LOADING…" : "RUN"}
        </button>
      </div>

      {error && (
        <div
          className="px-4 py-3 text-xs mb-4"
          style={{ background: "#1E1212", color: "var(--brick)", border: "1px solid #4A2020", borderRadius: "4px" }}
        >
          {error}
        </div>
      )}

      {/* Empty state — not loaded yet */}
      {!loaded && !loading && (
        <div
          className="flex items-center gap-6 px-6 py-8"
          style={{ border: "1px solid var(--hairline)", borderRadius: "4px" }}
        >
          <div className="flex-1">
            <ValueLedgerMark predicted={undefined} actual={undefined} dormant />
          </div>
          <p className="text-xs shrink-0" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}>
            SELECT FILTERS AND CLICK RUN
          </p>
        </div>
      )}

      {loaded && displayRows.length === 0 && (
        <div
          className="flex items-center gap-6 px-6 py-8"
          style={{ border: "1px solid var(--hairline)", borderRadius: "4px" }}
        >
          <div className="flex-1">
            <ValueLedgerMark predicted={undefined} actual={undefined} dormant />
          </div>
          <p className="text-xs shrink-0" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}>
            NO RESULTS — TRY RELAXING FILTERS
          </p>
        </div>
      )}

      {displayRows.length > 0 && (
        <>
          <p
            className="text-xs mb-2"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}
          >
            {displayRows.length} ENTRIES{highConfOnly ? " · HIGH CONFIDENCE ONLY" : ""}
          </p>
          <div className="mb-4 overflow-hidden" style={{ border: "1px solid var(--hairline)", borderRadius: "4px" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--ink)", borderBottom: "1px solid var(--hairline)" }}>
                  {["#", "Player", "Pos", "Age", "Club", "Season", "Fair Value", "Transfer Fee", "Value Mark", "Arbitrage"].map((h) => (
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
                {displayRows.map((r, i) => (
                  <tr
                    key={`${r.player_id}-${r.season}`}
                    className="transition-opacity hover:opacity-80"
                    style={{
                      borderBottom: "1px solid var(--hairline)",
                      background: i % 2 === 0 ? "var(--panel)" : "transparent",
                    }}
                  >
                    <td className="px-3 py-2.5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                      {i + 1}
                    </td>
                    <td className="px-3 py-2.5 font-medium">
                      <Link
                        href={`/?player=${r.player_id}`}
                        className="hover:underline"
                        style={{ color: "var(--parchment)" }}
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5" style={{ color: "var(--text-secondary)" }}>{r.position_group}</td>
                    <td className="px-3 py-2.5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}>{r.age}</td>
                    <td className="px-3 py-2.5 max-w-28 truncate" style={{ color: "var(--text-secondary)" }}>{r.club ?? "—"}</td>
                    <td className="px-3 py-2.5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}>{r.season}</td>
                    <td className="px-3 py-2.5" style={{ fontFamily: "var(--font-ibm-plex-mono)", fontVariantNumeric: "tabular-nums", color: "var(--parchment)" }}>
                      {fmtEur(r.predicted_fair_value)}
                    </td>
                    <td className="px-3 py-2.5" style={{ fontFamily: "var(--font-ibm-plex-mono)", fontVariantNumeric: "tabular-nums", color: "var(--parchment)" }}>
                      {fmtEur(r.actual_fee)}
                    </td>
                    <td className="px-3 py-2.5" style={{ minWidth: "120px" }}>
                      <ValueLedgerMark
                        predicted={r.predicted_fair_value}
                        actual={r.actual_fee}
                        variant="static"
                      />
                    </td>
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
    <div className="flex flex-col gap-1.5">
      <label
        className="text-xs"
        style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)", letterSpacing: "0.06em" }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 text-xs outline-none"
        style={{
          background: "var(--ink)",
          border: "1px solid var(--hairline)",
          color: "var(--parchment)",
          borderRadius: "4px",
          fontFamily: "var(--font-ibm-plex-mono)",
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
