"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { api, SimilarPlayer, PlayerSearchResult, fmtEur } from "@/lib/api";
import ConfidenceNote from "@/components/ConfidenceNote";
import Link from "next/link";

export default function SimilarityPage() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("player_id");
  const initialName = searchParams.get("name");

  const [query, setQuery] = useState(initialName ?? "");
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialId ? Number(initialId) : null
  );
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

  // Auto-load if arrived via link with player_id
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
      <h1 className="text-2xl font-bold mb-2">Similar Players</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Find players with the most similar statistical profiles. Toggle{" "}
        <strong>Cheaper Only</strong> to restrict to players whose fair value is lower.
      </p>

      {/* Search + controls */}
      <div
        className="rounded-xl p-5 mb-6 flex flex-col gap-4 md:flex-row md:items-end"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex-1 relative" ref={dropdownRef}>
          <label className="text-xs block mb-1" style={{ color: "var(--text-secondary)" }}>
            Player
          </label>
          <input
            type="text"
            placeholder="Search player name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: "var(--surface2)",
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
                  className="w-full px-4 py-2 text-left text-sm hover:opacity-80 transition-opacity flex items-center justify-between"
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

        <div className="flex items-center gap-3">
          <label className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Cheaper Only
          </label>
          <button
            onClick={toggleCheaper}
            className="relative w-10 h-5 rounded-full transition-colors"
            style={{
              background: cheaperOnly ? "var(--accent-blue)" : "var(--surface2)",
              border: "1px solid var(--border)",
            }}
            aria-pressed={cheaperOnly}
          >
            <span
              className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform"
              style={{
                background: "#fff",
                transform: cheaperOnly ? "translateX(20px)" : "translateX(0)",
              }}
            />
          </button>
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm mb-4"
          style={{ background: "#2a1a1a", color: "var(--accent-red)", border: "1px solid #5a2020" }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-12" style={{ color: "var(--text-secondary)" }}>
          Loading…
        </div>
      )}

      {!loaded && !loading && (
        <div className="rounded-xl p-12 text-center" style={{ border: "1px dashed var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Search for a player to find their statistical twins
          </p>
        </div>
      )}

      {loaded && similar.length === 0 && (
        <p className="text-center py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
          No similar players found{cheaperOnly ? " within cheaper-only filter" : ""}.
        </p>
      )}

      {similar.length > 0 && (
        <>
          <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
            Top {similar.length} statistical twins for{" "}
            <strong style={{ color: "var(--text-primary)" }}>{selectedName}</strong>
            {cheaperOnly ? " · cheaper only" : ""}
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
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/?player=${p.player_id}`}
            className="font-semibold text-sm hover:underline"
          >
            {p.name}
          </Link>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {p.position_group} · Age {p.age} · {p.club ?? "—"}
          </p>
          {p.league && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {p.league}
            </p>
          )}
        </div>
        <SimilarityPill pct={pct} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatBox label="Fair Value" value={fmtEur(p.predicted_fair_value)} />
        <StatBox label="Market Value" value={fmtEur(p.market_value_in_eur)} />
      </div>
    </div>
  );
}

function SimilarityPill({ pct }: { pct: number }) {
  const color =
    pct >= 85 ? "var(--accent-green)" : pct >= 70 ? "var(--accent-amber)" : "var(--text-secondary)";
  return (
    <span
      className="shrink-0 text-xs font-mono font-semibold px-2 py-1 rounded-lg"
      style={{ background: "var(--surface2)", color, border: "1px solid var(--border)" }}
    >
      {pct}% match
    </span>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2 text-center" style={{ background: "var(--surface2)" }}>
      <div className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>
        {label}
      </div>
      <div className="font-mono text-xs font-semibold">{value}</div>
    </div>
  );
}
