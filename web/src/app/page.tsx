"use client";

import { useState, useEffect, useRef } from "react";
import { api, PlayerDetail, PlayerSearchResult, fmtEur } from "@/lib/api";
import ValueBar from "@/components/ValueBar";
import ResidualBadge from "@/components/ResidualBadge";
import ConfidenceNote from "@/components/ConfidenceNote";
import Link from "next/link";

export default function PlayerLookupPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.searchPlayers(query);
        setResults(data);
        setShowDropdown(data.length > 0);
      } catch {
        setResults([]);
      }
    }, 250);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function selectPlayer(p: PlayerSearchResult) {
    setShowDropdown(false);
    setQuery(p.name);
    setLoading(true);
    setError(null);
    try {
      const detail = await api.getPlayer(p.player_id);
      setSelected(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load player");
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Player Lookup</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Search any player to see their predicted fair value vs actual transfer fee and market value.
      </p>

      {/* Search box */}
      <div className="relative mb-6" ref={dropdownRef}>
        <input
          type="text"
          placeholder="Search player name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-3 rounded-lg text-sm outline-none"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
        {showDropdown && (
          <div
            className="absolute top-full left-0 right-0 z-50 rounded-lg mt-1 overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            {results.map((p) => (
              <button
                key={p.player_id}
                onClick={() => selectPlayer(p)}
                className="w-full px-4 py-2.5 text-left text-sm hover:opacity-80 transition-opacity flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span>{p.name}</span>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {p.position_group} · {p.current_club_name ?? "—"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-12" style={{ color: "var(--text-secondary)" }}>
          Loading…
        </div>
      )}

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "#2a1a1a", color: "var(--accent-red)", border: "1px solid #5a2020" }}>
          {error}
        </div>
      )}

      {selected && !loading && (
        <div className="flex flex-col gap-6">
          {/* Header card */}
          <div
            className="rounded-xl p-6"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold">{selected.name}</h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {selected.position_group} · Age {selected.age} · {selected.club ?? "—"}
                  {selected.league ? ` · ${selected.league}` : ""}
                </p>
              </div>
              <ResidualBadge residual={selected.arbitrage_residual} />
            </div>

            <ValueBar
              predicted={selected.predicted_fair_value}
              actual={selected.last_transfer_fee}
              market={selected.market_value_in_eur}
            />

            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { label: "Fair Value (model)", value: fmtEur(selected.predicted_fair_value) },
                { label: "Last Transfer Fee", value: fmtEur(selected.last_transfer_fee) },
                { label: "Market Value", value: fmtEur(selected.market_value_in_eur) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg px-3 py-2.5 text-center" style={{ background: "var(--surface2)" }}>
                  <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{label}</div>
                  <div className="font-mono text-sm font-semibold">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SHAP */}
          {selected.shap_explanation.length > 0 ? (
            <div
              className="rounded-xl p-5"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <h3 className="font-semibold mb-3 text-sm">Feature Importance (SHAP)</h3>
              <div className="flex flex-col gap-2">
                {selected.shap_explanation.slice(0, 10).map((e) => (
                  <div key={e.feature} className="flex items-center gap-3 text-xs">
                    <span className="w-44 shrink-0 truncate" style={{ color: "var(--text-secondary)" }}>
                      {e.feature}
                    </span>
                    <div className="flex-1 rounded-full h-3 overflow-hidden" style={{ background: "var(--border)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(Math.abs(e.shap_value) * 200, 100)}%`,
                          background: e.shap_value > 0 ? "var(--accent-green)" : "var(--accent-red)",
                        }}
                      />
                    </div>
                    <span className="w-16 text-right font-mono">{e.shap_value.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl p-4 text-sm text-center"
              style={{ color: "var(--text-secondary)", border: "1px dashed var(--border)" }}
            >
              SHAP explanation — precomputed lookup planned as next feature
            </div>
          )}

          {/* Action link */}
          <div className="flex gap-3 text-sm">
            <Link
              href={`/similarity?player_id=${selected.player_id}&name=${encodeURIComponent(selected.name)}`}
              className="px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              Find similar players →
            </Link>
          </div>

          <ConfidenceNote />
        </div>
      )}

      {!selected && !loading && !error && (
        <div className="rounded-xl p-12 text-center" style={{ border: "1px dashed var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Type a player name to get started
          </p>
        </div>
      )}
    </div>
  );
}
