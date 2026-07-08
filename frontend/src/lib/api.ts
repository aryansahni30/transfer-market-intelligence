import type { Player, Driver, Confidence, Position } from "./mock/players";
import type { TransferRow } from "./mock/transfers";
import type { ScoutCandidate } from "./mock/scoutPool";
import type { SimNode } from "./mock/similarity";
import { slugify } from "./format";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

// ─── Raw backend types ────────────────────────────────────────────────────────

interface RawSearchResult {
  player_id: number;
  name: string;
  position_group: string;
  age: number;
  current_club_name?: string;
}

interface RawShapEntry {
  feature: string;
  shap_value: number;
  feature_value: number | null;
}

interface RawPlayerDetail {
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
  shap_explanation: RawShapEntry[];
}

interface RawArbitrageEntry {
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

interface RawRecruitmentCandidate {
  player_id: number;
  name: string;
  position_group: string;
  sub_position: string | null;
  age: number;
  club: string | null;
  league: string | null;
  league_tier: number | null;
  predicted_fair_value: number;
  asking_price: number | null;
  value_ratio: number | null;
  arbitrage_residual: number | null;
  durability_score: number | null;
}

interface RawSimilarPlayer {
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

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function get<T>(
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== null && v !== undefined) {
        url.searchParams.set(k, String(v));
      }
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

// ─── Adapter helpers ──────────────────────────────────────────────────────────

const POSITION_MAP: Record<string, Position> = {
  forward: "ST",
  Forward: "ST",
  midfielder: "CM",
  Midfielder: "CM",
  defender: "CB",
  Defender: "CB",
  goalkeeper: "GK",
  Goalkeeper: "GK",
  GK: "GK",
};

const SUB_POSITION_MAP: Record<string, Position> = {
  Goalkeeper: "GK",
  "Centre-Back": "CB",
  "Left-Back": "LB",
  "Right-Back": "RB",
  "Defensive Midfield": "CDM",
  "Central Midfield": "CM",
  "Attacking Midfield": "CAM",
  "Left Winger": "LW",
  "Right Winger": "RW",
  "Centre-Forward": "ST",
  "Second Striker": "ST",
};

function mapPosition(pg: string): Position {
  return POSITION_MAP[pg] ?? POSITION_MAP[pg.toLowerCase()] ?? "CM";
}

function deriveConfidence(residual: number | null, fairMid: number | null): Confidence {
  if (residual === null || fairMid === null || fairMid === 0) return "low";
  const ratio = Math.abs(residual / fairMid);
  if (ratio < 0.2) return "high";
  if (ratio < 0.4) return "mid";
  return "low";
}

function deriveConfidenceNote(c: Confidence): string {
  if (c === "high") return "High confidence — dense comparable set.";
  if (c === "mid") return "Moderate confidence — limited comps.";
  return "Low confidence — sparse data.";
}

function deriveFairRange(mid: number | null): {
  fairLow: number;
  fairMid: number;
  fairHigh: number;
} {
  const m = mid ?? 0;
  return { fairLow: m * 0.78, fairMid: m, fairHigh: m * 1.22 };
}

function clampLeagueTier(t: number | null): 1 | 2 | 3 {
  if (t === null || t < 1) return 1;
  if (t > 3) return 3;
  return t as 1 | 2 | 3;
}

export function inferLeagueTier(league: string | null): 1 | 2 | 3 {
  if (!league) return 3;
  const l = league.toLowerCase();
  const tier1 = [
    "premier league",
    "la liga",
    "bundesliga",
    "serie a",
    "ligue 1",
    "eredivisie",
    "primeira liga",
    "champions league",
  ];
  const tier2 = [
    "championship",
    "2. bundesliga",
    "serie b",
    "ligue 2",
    "segunda división",
    "segunda",
    "segunda division",
    "liga nos",
    "jupiler",
    "pro league",
    "belgian",
    "scottish",
    "turkish",
    "süper lig",
    "super lig",
    "russian",
    "greek",
    "austrian",
  ];
  if (tier1.some((t) => l.includes(t))) return 1;
  if (tier2.some((t) => l.includes(t))) return 2;
  return 3;
}

function formatSeason(season: number): string {
  return `${season}/${String(season + 1).slice(-2)}`;
}

function formatFeature(feature: string): string {
  return feature.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapShapToDrivers(shap: RawShapEntry[]): Driver[] {
  return [...shap]
    .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
    .slice(0, 6)
    .map((e) => ({
      label: formatFeature(e.feature),
      direction: e.shap_value > 0 ? ("up" as const) : ("down" as const),
      note: e.feature_value !== null ? String(e.feature_value) : "",
    }));
}

function generateSimCoords(playerId: number, similarity: number): { x: number; y: number } {
  const angle = (playerId * 2.399963) % (2 * Math.PI);
  const radius = (1 - similarity) * 0.42;
  const x = Math.max(0.05, Math.min(0.95, 0.5 + Math.cos(angle) * radius));
  const y = Math.max(0.05, Math.min(0.95, 0.5 + Math.sin(angle) * radius));
  return { x, y };
}

async function resolveSlugToId(slug: string): Promise<number> {
  const query = slug.replace(/-/g, " ");
  const results = await get<RawSearchResult[]>("/api/players/search", { q: query, limit: 500 });
  const match = results.find((r) => slugify(r.name) === slug);
  if (!match) throw new Error(`No player found for slug: ${slug}`);
  return match.player_id;
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SearchResult {
  player_id: number;
  name: string;
  slug: string;
  position_group: string;
  age: number;
  club: string | null | undefined;
}

export interface SimilarData {
  anchor: SimNode;
  nodes: SimNode[];
}

// ─── Public API functions ─────────────────────────────────────────────────────

export async function searchPlayers(q: string): Promise<SearchResult[]> {
  if (!q.trim()) return [];
  const raw = await get<RawSearchResult[]>("/api/players/search", { q });
  return raw.map((r) => ({
    player_id: r.player_id,
    name: r.name,
    slug: slugify(r.name),
    position_group: r.position_group,
    age: r.age,
    club: r.current_club_name ?? null,
  }));
}

export async function getPlayerBySlug(slug: string): Promise<Player> {
  const id = await resolveSlugToId(slug);
  const raw = await get<RawPlayerDetail>(`/api/players/${id}`);

  const fairMid = raw.predicted_fair_value;
  const { fairLow, fairMid: fm, fairHigh } = deriveFairRange(fairMid);
  const confidence = deriveConfidence(raw.arbitrage_residual, fairMid);

  const player: Player = {
    slug,
    name: raw.name,
    club: raw.club ?? "Unknown",
    clubShort: raw.club ?? undefined,
    league: raw.league ?? "Unknown",
    leagueTier: inferLeagueTier(raw.league),
    position: mapPosition(raw.position_group),
    age: Math.round(raw.age),
    foot: "R",
    nationality: "",
    marketValue: raw.market_value_in_eur ?? fm,
    fairLow,
    fairMid: fm,
    fairHigh,
    confidence,
    confidenceNote: deriveConfidenceNote(confidence),
    drivers: mapShapToDrivers(raw.shap_explanation),
    lastTransfer:
      raw.last_transfer_fee !== null
        ? {
            from: "—",
            to: raw.club ?? "Unknown",
            season: "—",
            fee: raw.last_transfer_fee,
          }
        : undefined,
  };

  return player;
}

export async function getArbitrageBoard(params?: {
  limit?: number;
  direction?: string;
  position?: string;
  league_tier?: number;
  season?: number;
}): Promise<TransferRow[]> {
  const raw = await get<RawArbitrageEntry[]>("/api/arbitrage/board", {
    limit: Math.min(params?.limit ?? 200, 200),
    direction: params?.direction,
    position: params?.position,
    league_tier: params?.league_tier,
    season: params?.season,
  });

  return raw.map((e): TransferRow => {
    const fairMid = e.predicted_fair_value;
    const { fairLow, fairMid: fm, fairHigh } = deriveFairRange(fairMid);
    const confidence = deriveConfidence(e.arbitrage_residual, fairMid);
    const fee = e.actual_fee ?? 0;

    return {
      id: `${e.player_id}-${e.season}`,
      playerName: e.name,
      playerSlug: slugify(e.name),
      position: mapPosition(e.position_group),
      from: "—",
      to: e.club ?? "Unknown",
      toLeague: e.league ?? "Unknown",
      leagueTier: clampLeagueTier(e.league_tier),
      season: formatSeason(e.season),
      fee,
      fairLow,
      fairMid: fm,
      fairHigh,
      confidence,
    };
  });
}

const POSITION_TO_GROUP: Record<Position, string> = {
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

const ALL_POSITION_GROUPS = ["GK", "Defender", "Midfielder", "Forward"] as const;

export async function getRecruitmentCandidates(params: {
  budget: number;
  position: Position | null;
  ageMin: number;
  ageMax: number;
}): Promise<ScoutCandidate[]> {
  const broadGroup = params.position ? POSITION_TO_GROUP[params.position] : null;

  const fetchGroup = (group: string) =>
    get<RawRecruitmentCandidate[]>("/api/recruitment/candidates", {
      budget: params.budget,
      position: group,
      min_age: params.ageMin,
      max_age: params.ageMax,
      limit: 50,
    });

  const raw = broadGroup
    ? await fetchGroup(broadGroup)
    : (await Promise.all(ALL_POSITION_GROUPS.map(fetchGroup))).flat();

  return raw.map((c): ScoutCandidate => {
    const fm = c.predicted_fair_value;
    const { fairLow, fairMid, fairHigh } = deriveFairRange(fm);
    const askingPrice = c.asking_price ?? fm * 0.8;
    const ratio = c.value_ratio ?? (fm > 0 ? fm / askingPrice : 1);
    const confidence = deriveConfidence(c.arbitrage_residual, fm);

    return {
      slug: slugify(c.name),
      name: c.name,
      club: c.club ?? "Unknown",
      league: c.league ?? "Unknown",
      leagueTier:
        c.league_tier !== null ? clampLeagueTier(c.league_tier) : inferLeagueTier(c.league),
      position:
        (c.sub_position ? SUB_POSITION_MAP[c.sub_position] : undefined) ??
        mapPosition(c.position_group),
      age: Math.round(c.age),
      askingPrice,
      fairLow,
      fairMid,
      fairHigh,
      ratio,
      reason: `Fair value ${ratio.toFixed(2)}× asking price.`,
      confidence,
    };
  });
}

export async function getSimilarBySlug(slug: string, k = 20): Promise<SimilarData> {
  const anchorId = await resolveSlugToId(slug);

  const [anchorRaw, similarRaw] = await Promise.all([
    get<RawPlayerDetail>(`/api/players/${anchorId}`),
    get<RawSimilarPlayer[]>(`/api/similarity/${anchorId}`, { k }),
  ]);

  const anchorFm = anchorRaw.predicted_fair_value ?? 0;

  const anchor: SimNode = {
    slug,
    name: anchorRaw.name,
    club: anchorRaw.club ?? "Unknown",
    age: Math.round(anchorRaw.age),
    marketValue: anchorRaw.market_value_in_eur ?? anchorFm,
    x: 0.5,
    y: 0.5,
    minutes: 2000,
    similarity: 1,
  };

  const nodes: SimNode[] = similarRaw.map((s) => {
    const coords = generateSimCoords(s.player_id, s.similarity_score);
    return {
      slug: slugify(s.name),
      name: s.name,
      club: s.club ?? "Unknown",
      age: Math.round(s.age),
      marketValue: s.market_value_in_eur ?? s.predicted_fair_value ?? 0,
      x: coords.x,
      y: coords.y,
      minutes: 2000,
      similarity: s.similarity_score,
    };
  });

  return { anchor, nodes };
}
