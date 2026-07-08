import type { Position } from "./players";

export interface ScoutCandidate {
  slug: string;
  name: string;
  club: string;
  league: string;
  leagueTier: 1 | 2 | 3;
  position: Position;
  age: number;
  askingPrice: number;
  fairLow: number;
  fairMid: number;
  fairHigh: number;
  ratio: number;                // fairMid / askingPrice
  reason: string;
  confidence: "high" | "mid" | "low";
}

const M = (n: number) => n * 1_000_000;

export const scoutPool: ScoutCandidate[] = [
  { slug: "lois-openda", name: "Loïs Openda", club: "RB Leipzig", league: "Bundesliga", leagueTier: 1, position: "ST", age: 25,
    askingPrice: M(45), fairLow: M(52), fairMid: M(64), fairHigh: M(78), ratio: 1.42,
    reason: "Producing top-decile off-ball movement for a striker at 25 in a tier-1 league, priced below rotation-ST rate.",
    confidence: "high" },
  { slug: "jonathan-david", name: "Jonathan David", club: "Juventus", league: "Serie A", leagueTier: 1, position: "ST", age: 25,
    askingPrice: M(45), fairLow: M(56), fairMid: M(70), fairHigh: M(84), ratio: 1.56,
    reason: "Five straight 15+ goal tier-1 seasons; low injury load; consistently under-priced against fair value.",
    confidence: "high" },
  { slug: "santiago-gimenez", name: "Santiago Giménez", club: "AC Milan", league: "Serie A", leagueTier: 1, position: "ST", age: 24,
    askingPrice: M(40), fairLow: M(48), fairMid: M(62), fairHigh: M(78), ratio: 1.55,
    reason: "Top-quartile npxG/90 in Eredivisie translated into a strong first Serie A season.",
    confidence: "mid" },
  { slug: "artem-dovbyk", name: "Artem Dovbyk", club: "Roma", league: "Serie A", leagueTier: 1, position: "ST", age: 28,
    askingPrice: M(35), fairLow: M(38), fairMid: M(52), fairHigh: M(68), ratio: 1.49,
    reason: "La Liga Pichichi season plus efficient shot selection; age is the main variance driver.",
    confidence: "mid" },
  { slug: "hugo-ekitike", name: "Hugo Ekitiké", club: "Eintracht Frankfurt", league: "Bundesliga", leagueTier: 1, position: "ST", age: 23,
    askingPrice: M(40), fairLow: M(42), fairMid: M(56), fairHigh: M(72), ratio: 1.40,
    reason: "Age-23 tier-1 ST scarcity; carrying + hold-up profile fits big-club rotation.",
    confidence: "mid" },
  { slug: "goncalo-inacio", name: "Gonçalo Inácio", club: "Sporting CP", league: "Primeira Liga", leagueTier: 2, position: "CB", age: 24,
    askingPrice: M(45), fairLow: M(58), fairMid: M(72), fairHigh: M(88), ratio: 1.60,
    reason: "Left-footed CB with elite progression volume, under 25, tier-2 sample dense enough to translate.",
    confidence: "high" },
  { slug: "castello-lukeba", name: "Castello Lukeba", club: "RB Leipzig", league: "Bundesliga", leagueTier: 1, position: "CB", age: 22,
    askingPrice: M(35), fairLow: M(48), fairMid: M(62), fairHigh: M(78), ratio: 1.77,
    reason: "Age-22 tier-1 CB with 2 full seasons; duel rate top decile; priced like a rotation option.",
    confidence: "high" },
  { slug: "murillo", name: "Murillo", club: "Nottingham Forest", league: "Premier League", leagueTier: 1, position: "CB", age: 22,
    askingPrice: M(40), fairLow: M(50), fairMid: M(64), fairHigh: M(80), ratio: 1.60,
    reason: "Aggressive defender profile producing PL top-decile recoveries per 90 at 22.",
    confidence: "mid" },
  { slug: "youssouf-fofana", name: "Youssouf Fofana", club: "AC Milan", league: "Serie A", leagueTier: 1, position: "CDM", age: 26,
    askingPrice: M(28), fairLow: M(40), fairMid: M(52), fairHigh: M(66), ratio: 1.86,
    reason: "Tier-1 CDM with elite recovery volume; ratio widest in the pool for the position.",
    confidence: "high" },
  { slug: "morten-hjulmand", name: "Morten Hjulmand", club: "Sporting CP", league: "Primeira Liga", leagueTier: 2, position: "CDM", age: 26,
    askingPrice: M(30), fairLow: M(38), fairMid: M(50), fairHigh: M(64), ratio: 1.67,
    reason: "Ball-winner archetype; profile similar to Kanté-vintage recovery signal.",
    confidence: "mid" },
  { slug: "arda-guler", name: "Arda Güler", club: "Real Madrid", league: "La Liga", leagueTier: 1, position: "CAM", age: 20,
    askingPrice: M(45), fairLow: M(58), fairMid: M(78), fairHigh: M(102), ratio: 1.73,
    reason: "Age-20 tier-1 CAM with elite chance-creation per 90 despite limited minutes.",
    confidence: "low" },
  { slug: "kenan-yildiz", name: "Kenan Yıldız", club: "Juventus", league: "Serie A", leagueTier: 1, position: "CAM", age: 20,
    askingPrice: M(50), fairLow: M(62), fairMid: M(80), fairHigh: M(102), ratio: 1.60,
    reason: "Left-footed CAM/LW hybrid with a full tier-1 minutes load at 20; carrying volume elite.",
    confidence: "mid" },
  { slug: "xavi-simons", name: "Xavi Simons", club: "RB Leipzig", league: "Bundesliga", leagueTier: 1, position: "CAM", age: 22,
    askingPrice: M(80), fairLow: M(88), fairMid: M(112), fairHigh: M(140), ratio: 1.40,
    reason: "Three tier-1 seasons at 22; chance-creation top decile across leagues.",
    confidence: "high" },
  { slug: "rayan-cherki", name: "Rayan Cherki", club: "Manchester City", league: "Premier League", leagueTier: 1, position: "CAM", age: 22,
    askingPrice: M(35), fairLow: M(46), fairMid: M(60), fairHigh: M(78), ratio: 1.71,
    reason: "Elite dribble + creation volume; profile fits big-6 rotation at a tier-3 rotation price.",
    confidence: "mid" },
  { slug: "malick-fofana", name: "Malick Fofana", club: "Lyon", league: "Ligue 1", leagueTier: 1, position: "LW", age: 20,
    askingPrice: M(30), fairLow: M(42), fairMid: M(56), fairHigh: M(74), ratio: 1.87,
    reason: "Age-20 tier-1 LW with take-on success top decile; largest fair-value ratio in the winger pool.",
    confidence: "mid" },
  { slug: "yankuba-minteh", name: "Yankuba Minteh", club: "Brighton", league: "Premier League", leagueTier: 1, position: "RW", age: 21,
    askingPrice: M(30), fairLow: M(38), fairMid: M(50), fairHigh: M(66), ratio: 1.67,
    reason: "Age-21 tier-1 RW with elite progressive-carry volume; sample small but trending.",
    confidence: "low" },
  { slug: "antoine-semenyo", name: "Antoine Semenyo", club: "Bournemouth", league: "Premier League", leagueTier: 1, position: "RW", age: 25,
    askingPrice: M(35), fairLow: M(44), fairMid: M(58), fairHigh: M(76), ratio: 1.66,
    reason: "Two full PL seasons with rising G+A/90; ratio above 1.6 despite tier-1 price.",
    confidence: "high" },
];
