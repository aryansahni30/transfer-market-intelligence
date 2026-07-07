const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface PlayerSearchResult {
  player_id: number;
  name: string;
  position_group: string;
  age: number;
  current_club_name?: string;
}

export interface ShapEntry {
  feature: string;
  shap_value: number;
  feature_value: number | null;
}

export interface PlayerDetail {
  player_id: number;
  name: string;
  position_group: string;
  age: number;
  club: string | null;
  league: string | null;
  predicted_fair_value: number | null;
  market_value_in_eur: number | null;
  last_transfer_fee: number | null;
  arbitrage_residual: number | null;
  shap_explanation: ShapEntry[];
}

export interface ArbitrageEntry {
  player_id: number;
  name: string;
  position_group: string;
  age: number;
  club: string | null;
  league: string | null;
  league_tier: number | null;
  season: number;
  predicted_fair_value: number;
  actual_fee: number | null;
  market_value_in_eur: number | null;
  arbitrage_residual: number | null;
}

export interface RecruitmentCandidate {
  player_id: number;
  name: string;
  position_group: string;
  age: number;
  club: string | null;
  league: string | null;
  predicted_fair_value: number;
  asking_price: number | null;
  value_ratio: number | null;
  arbitrage_residual: number | null;
  durability_score: number | null;
}

export interface SimilarPlayer {
  player_id: number;
  name: string;
  position_group: string;
  age: number;
  club: string | null;
  league: string | null;
  predicted_fair_value: number | null;
  market_value_in_eur: number | null;
  similarity_score: number;
  rank: number;
}

// ── API calls ──────────────────────────────────────────────────────────────

export const api = {
  searchPlayers: (q: string) =>
    get<PlayerSearchResult[]>(`/api/players/search?q=${encodeURIComponent(q)}`),

  getPlayer: (id: number) =>
    get<PlayerDetail>(`/api/players/${id}`),

  getArbitrageBoard: (params: {
    direction?: "overpaid" | "underpaid" | "all";
    position?: string;
    league_tier?: number;
    season?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params.direction) q.set("direction", params.direction);
    if (params.position) q.set("position", params.position);
    if (params.league_tier != null) q.set("league_tier", String(params.league_tier));
    if (params.season != null) q.set("season", String(params.season));
    if (params.limit != null) q.set("limit", String(params.limit));
    return get<ArbitrageEntry[]>(`/api/arbitrage/board?${q}`);
  },

  getRecruitmentCandidates: (params: {
    budget: number;
    position: string;
    max_age?: number;
    min_age?: number;
    league_tier?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    q.set("budget", String(params.budget));
    q.set("position", params.position);
    if (params.max_age != null) q.set("max_age", String(params.max_age));
    if (params.min_age != null) q.set("min_age", String(params.min_age));
    if (params.league_tier != null) q.set("league_tier", String(params.league_tier));
    if (params.limit != null) q.set("limit", String(params.limit));
    return get<RecruitmentCandidate[]>(`/api/recruitment/candidates?${q}`);
  },

  getSimilarPlayers: (
    playerId: number,
    k?: number,
    cheaperOnly?: boolean
  ) => {
    const q = new URLSearchParams();
    if (k != null) q.set("k", String(k));
    if (cheaperOnly) q.set("cheaper_only", "true");
    return get<SimilarPlayer[]>(`/api/similarity/${playerId}?${q}`);
  },
};

// ── Formatters ─────────────────────────────────────────────────────────────

export function fmtEur(value: number | null | undefined): string {
  if (value == null) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `€${(value / 1_000).toFixed(0)}K`;
  return `€${value.toFixed(0)}`;
}

export function fmtPct(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(0)}%`;
}
