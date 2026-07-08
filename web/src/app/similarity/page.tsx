"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api, SimilarPlayer, PlayerSearchResult, fmtEur } from "@/lib/api";
import ConfidenceNote from "@/components/ConfidenceNote";
import ValueLedgerMark from "@/components/ValueLedgerMark";
import Link from "next/link";

export default function SimilarityPage() {
  return (
    <Suspense>
      <SimilarityContent />
    </Suspense>
  );
}

function SimilarityContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("player_id");
  const initialName = searchParams.get("name");

  const [query, setQuery] = useState(initialName ?? "");
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(initialId ? Number(initialId) : null);
  const [selectedName, setSelectedName] = useState(initialName ?? "");
  const [cheaperOnly, setCheaperOnly] = useState(false);
  const [similar, setSimilar] = useState<SimilarPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
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

  const fetchSimilar = useCallback(async (id: number, cheaper: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSimilarPlayers(id, 10, cheaper);
      setSimilar(data);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchSimilar(selectedId, cheaperOnly);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectPlayer(p: PlayerSearchResult) {
    setShowDropdown(false);
    setQuery(p.name);
    setSelectedId(p.player_id);
    setSelectedName(p.name);
    setSimilar([]);
    setLoaded(false);
    fetchSimilar(p.player_id, cheaperOnly);
  }

  function toggleCheaper() {
    const next = !cheaperOnly;
    setCheaperOnly(next);
    if (selectedId) fetchSimilar(selectedId, next);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <h1
        className="text-3xl mb-1"
        style={{ fontFamily: "var(--font-fraunces)", fontWeight: 600, color: "var(--parchment)" }}
      >
        Similarity Map
      </h1>
      <p className="text-xs mb-8" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-public-sans)" }}>
        Find players with the most similar statistical profiles. Toggle{" "}
        <span style={{ color: "var(--gold)" }}>Cheaper Only</span> to restrict to players whose fair value is lower.
      </p>

      {/* Search + controls */}
      <div
        className="p-5 mb-6 flex flex-col gap-4 md:flex-row md:items-end"
        style={{ background: "var(--panel)", border: "1px solid var(--hairline)", borderRadius: "4px" }}
      >
        <div className="flex-1 relative" ref={dropdownRef}>
          <label
            className="text-xs block mb-1.5"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)", letterSpacing: "0.06em" }}
          >
            PLAYER
          </label>
          <input
            type="text"
            placeholder="> search player…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm outline-none"
            style={{
              background: "var(--ink)",
              border: "1px solid var(--hairline)",
              color: "var(--parchment)",
              borderRadius: "4px",
              fontFamily: "var(--font-ibm-plex-mono)",
              caretColor: "var(--gold)",
            }}
          />
          {showDropdown && (
            <div
              className="absolute top-full left-0 right-0 z-50 mt-0.5 overflow-hidden"
              style={{ background: "var(--panel)", border: "1px solid var(--hairline)", borderRadius: "4px" }}
            >
              {results.map((p) => (
                <button
                  key={p.player_id}
                  onClick={() => selectPlayer(p)}
                  className="w-full px-4 py-2 text-left text-xs hover:opacity-80 transition-opacity flex items-center justify-between"
                  style={{ borderBottom: "1px solid var(--hairline)" }}
                >
                  <span style={{ color: "var(--parchment)" }}>{p.name}</span>
                  <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                    {p.position_group} · {p.current_club_name ?? "—"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cheaper only toggle */}
        <div className="flex items-center gap-3">
          <label
            className="text-xs"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)", letterSpacing: "0.04em" }}
          >
            CHEAPER ONLY
          </label>
          <button
            onClick={toggleCheaper}
            className="relative w-10 h-5 transition-colors"
            style={{
              background: cheaperOnly ? "var(--gold)" : "var(--ink)",
              border: `1px solid ${cheaperOnly ? "var(--gold)" : "var(--hairline)"}`,
              borderRadius: "10px",
            }}
            aria-pressed={cheaperOnly}
          >
            <span
              className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform"
              style={{
                background: cheaperOnly ? "var(--ink)" : "var(--hairline)",
                transform: cheaperOnly ? "translateX(20px)" : "translateX(0)",
              }}
            />
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

      {loading && (
        <div
          className="text-center py-12 text-xs"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}
        >
          LOADING…
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
            SEARCH A PLAYER TO FIND STATISTICAL TWINS
          </p>
        </div>
      )}

      {loaded && similar.length === 0 && (
        <div
          className="flex items-center gap-6 px-6 py-8"
          style={{ border: "1px solid var(--hairline)", borderRadius: "4px" }}
        >
          <div className="flex-1">
            <ValueLedgerMark predicted={undefined} actual={undefined} dormant />
          </div>
          <p className="text-xs shrink-0" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}>
            NO SIMILAR PLAYERS FOUND{cheaperOnly ? " — CHEAPER ONLY" : ""}
          </p>
        </div>
      )}

      {similar.length > 0 && (
        <>
          <p
            className="text-xs mb-3"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}
          >
            TOP {similar.length} TWINS FOR{" "}
            <span style={{ color: "var(--parchment)" }}>{selectedName.toUpperCase()}</span>
            {cheaperOnly ? " · CHEAPER ONLY" : ""}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {similar.map((p) => (
              <SimilarCard key={p.player_id} player={p} />
            ))}
          </div>
          <ConfidenceNote />
        </>
      )}
    </div>
  );
}

function SimilarCard({ player: p }: { player: SimilarPlayer }) {
  const pct = Math.round(p.similarity_score * 100);
  return (
    <div
      className="p-4 flex flex-col gap-3"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--hairline)",
        borderRadius: "4px",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/?player=${p.player_id}`}
            className="font-semibold text-sm hover:underline"
            style={{ color: "var(--parchment)", fontFamily: "var(--font-fraunces)" }}
          >
            {p.name}
          </Link>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}>
            {p.position_group} · AGE {p.age} · {p.club ?? "—"}
          </p>
          {p.league && (
            <p className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)" }}>
              {p.league}
            </p>
          )}
        </div>
        <SimilarityPill pct={pct} />
      </div>

      {/* Value Ledger Mark for each similar player */}
      <ValueLedgerMark
        predicted={p.predicted_fair_value}
        actual={p.market_value_in_eur}
        variant="static"
      />

      <div className="grid grid-cols-2 gap-2">
        <StatBox label="FAIR VALUE" value={fmtEur(p.predicted_fair_value)} />
        <StatBox label="MARKET VALUE" value={fmtEur(p.market_value_in_eur)} />
      </div>
    </div>
  );
}

function SimilarityPill({ pct }: { pct: number }) {
  const color =
    pct >= 85 ? "var(--verdigris)" : pct >= 70 ? "var(--gold)" : "var(--text-secondary)";
  return (
    <span
      className="shrink-0 text-xs font-semibold px-2 py-1"
      style={{
        background: "var(--ink)",
        color,
        border: "1px solid var(--hairline)",
        borderRadius: "4px",
        fontFamily: "var(--font-ibm-plex-mono)",
        whiteSpace: "nowrap",
      }}
    >
      {pct}% MATCH
    </span>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="px-3 py-2 text-center"
      style={{ background: "var(--ink)", border: "1px solid var(--hairline)", borderRadius: "4px" }}
    >
      <div
        className="text-xs mb-0.5"
        style={{ color: "var(--text-secondary)", fontFamily: "var(--font-ibm-plex-mono)", letterSpacing: "0.06em" }}
      >
        {label}
      </div>
      <div
        className="text-xs font-semibold"
        style={{ fontFamily: "var(--font-ibm-plex-mono)", fontVariantNumeric: "tabular-nums", color: "var(--parchment)" }}
      >
        {value}
      </div>
    </div>
  );
}
