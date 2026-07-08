"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api, PlayerDetail, PlayerSearchResult, fmtEur } from "@/lib/api";
import ValueLedgerMark from "@/components/ValueLedgerMark";
import ResidualBadge from "@/components/ResidualBadge";
import ConfidenceNote from "@/components/ConfidenceNote";
import Link from "next/link";

export default function PlayerLookupPage() {
  return (
    <Suspense>
      <PlayerLookupContent />
    </Suspense>
  );
}

function PlayerLookupContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K focus shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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

  useEffect(() => {
    const playerId = searchParams.get("player");
    if (!playerId) return;
    setLoading(true);
    setError(null);
    api.getPlayer(Number(playerId))
      .then((detail) => {
        setSelected(detail);
        setQuery(detail.name);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load player"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
      {/* Page title */}
      <h1
        className="text-3xl mb-1"
        style={{ fontFamily: "var(--font-fraunces)", fontWeight: 600, color: "var(--parchment)" }}
      >
        Player Lookup
      </h1>
      <p className="text-xs mb-8" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-public-sans)" }}>
        Search any player to see their predicted fair value vs. actual transfer fee and market value.
      </p>

      {/* Search */}
      <div className="relative mb-8" ref={dropdownRef}>
        <input
          ref={inputRef}
          type="text"
          placeholder="> search a player…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-5 py-4 text-sm outline-none"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--hairline)",
            borderRadius: "4px",
            color: "var(--parchment)",
            fontFamily: "var(--font-ibm-plex-mono)",
            caretColor: "var(--gold)",
          }}
        />
        <span
          className="absolute right-4 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}
        >
          ⌘K
        </span>

        {showDropdown && (
          <div
            className="absolute top-full left-0 right-0 z-50 mt-0.5 overflow-hidden"
            style={{
              background: "var(--panel)",
              border: "1px solid var(--hairline)",
              borderRadius: "4px",
            }}
          >
            {results.map((p) => (
              <button
                key={p.player_id}
                onClick={() => selectPlayer(p)}
                className="w-full px-5 py-2.5 text-left text-sm hover:opacity-80 transition-opacity flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--hairline)" }}
              >
                <span style={{ color: "var(--parchment)" }}>{p.name}</span>
                <span className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                  {p.position_group} · {p.current_club_name ?? "—"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-12 text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}>
          LOADING…
        </div>
      )}

      {error && (
        <div
          className="px-4 py-3 text-sm mb-6"
          style={{
            background: "#1E1212",
            color: "var(--brick)",
            border: "1px solid #4A2020",
            borderRadius: "4px",
          }}
        >
          {error}
        </div>
      )}

      {selected && !loading && (
        <div className="flex flex-col gap-5">
          {/* Header card */}
          <div
            className="p-6"
            style={{
              background: "var(--panel)",
              border: "1px solid var(--hairline)",
              borderRadius: "4px",
            }}
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2
                  className="text-xl mb-0.5"
                  style={{ fontFamily: "var(--font-fraunces)", fontWeight: 600, color: "var(--parchment)" }}
                >
                  {selected.name}
                </h2>
                <p className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                  {selected.position_group} · AGE {selected.age} · {selected.club ?? "—"}
                  {selected.league ? ` · ${selected.league}` : ""}
                </p>
              </div>
              <ResidualBadge residual={selected.arbitrage_residual} />
            </div>

            {/* Value Ledger Mark — live reveal */}
            <div className="mb-6">
              <ValueLedgerMark
                predicted={selected.predicted_fair_value}
                actual={selected.last_transfer_fee}
                confidence={0.7}
                variant="live-reveal"
              />
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "FAIR VALUE", value: fmtEur(selected.predicted_fair_value) },
                { label: "TRANSFER FEE", value: fmtEur(selected.last_transfer_fee) },
                { label: "MARKET VALUE", value: fmtEur(selected.market_value_in_eur) },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="px-3 py-2.5 text-center"
                  style={{ background: "var(--ink)", border: "1px solid var(--hairline)", borderRadius: "4px" }}
                >
                  <div
                    className="text-xs mb-1"
                    style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)", letterSpacing: "0.06em" }}
                  >
                    {label}
                  </div>
                  <div
                    className="text-sm font-semibold"
                    style={{ fontFamily: "var(--font-ibm-plex-mono)", fontVariantNumeric: "tabular-nums", color: "var(--parchment)" }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SHAP drivers */}
          {selected.shap_explanation.length > 0 ? (
            <div
              className="p-5"
              style={{
                background: "var(--panel)",
                border: "1px solid var(--hairline)",
                borderRadius: "4px",
              }}
            >
              <h3
                className="text-xs mb-4"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)", letterSpacing: "0.08em" }}
              >
                FEATURE IMPORTANCE (SHAP)
              </h3>
              <div className="flex flex-col">
                {selected.shap_explanation.slice(0, 10).map((e, i) => (
                  <div
                    key={e.feature}
                    className="stamp-in flex items-center gap-3 py-2 text-xs"
                    style={{
                      borderBottom: "1px solid var(--hairline)",
                      animation: `stamp-in 250ms var(--ease-precise) ${i * 50}ms both`,
                    }}
                  >
                    <span
                      className="w-44 shrink-0 truncate"
                      style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}
                    >
                      {e.feature}
                    </span>
                    <div
                      className="flex-1 h-1.5 overflow-hidden"
                      style={{ background: "var(--hairline)", borderRadius: "1px" }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(Math.abs(e.shap_value) * 200, 100)}%`,
                          background: e.shap_value > 0 ? "var(--verdigris)" : "var(--brick)",
                          borderRadius: "1px",
                        }}
                      />
                    </div>
                    <span
                      className="w-16 text-right"
                      style={{ fontFamily: "var(--font-ibm-plex-mono)", fontVariantNumeric: "tabular-nums", color: "var(--parchment)" }}
                    >
                      {e.shap_value.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              className="flex items-center gap-5 px-5 py-4"
              style={{ border: "1px solid var(--hairline)", borderRadius: "4px" }}
            >
              <div className="flex-1">
                <ValueLedgerMark predicted={undefined} actual={undefined} dormant />
              </div>
              <p className="text-xs shrink-0" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                SHAP explanation — precomputed lookup planned
              </p>
            </div>
          )}

          {/* Action link */}
          <div className="flex gap-3 text-xs">
            <Link
              href={`/similarity?player_id=${selected.player_id}&name=${encodeURIComponent(selected.name)}`}
              className="px-4 py-2 transition-opacity hover:opacity-70"
              style={{
                background: "var(--panel)",
                border: "1px solid var(--hairline)",
                borderRadius: "4px",
                color: "var(--parchment)",
                fontFamily: "var(--font-ibm-plex-mono)",
                letterSpacing: "0.04em",
              }}
            >
              FIND SIMILAR PLAYERS →
            </Link>
          </div>

          <ConfidenceNote />
        </div>
      )}

      {/* Empty state */}
      {!selected && !loading && !error && (
        <div
          className="flex items-center gap-6 px-6 py-8"
          style={{ border: "1px solid var(--hairline)", borderRadius: "4px" }}
        >
          <div className="flex-1">
            <ValueLedgerMark predicted={undefined} actual={undefined} dormant />
          </div>
          <p className="text-xs shrink-0" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}>
            TYPE A PLAYER NAME TO GET STARTED
          </p>
        </div>
      )}
    </div>
  );
}
