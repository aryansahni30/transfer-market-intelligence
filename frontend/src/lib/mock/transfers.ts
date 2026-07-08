import type { Confidence, Position } from "./players";

export interface TransferRow {
  id: string;
  playerName: string;
  playerSlug: string;
  position: Position;
  from: string;
  to: string;
  toLeague: string;
  leagueTier: 1 | 2 | 3;
  season: string;
  fee: number;              // actual fee paid
  fairLow: number;
  fairMid: number;
  fairHigh: number;
  confidence: Confidence;
}

const M = (n: number) => n * 1_000_000;

export const transfers: TransferRow[] = [
  { id: "t-neymar-2017", playerName: "Neymar Jr", playerSlug: "neymar-jr", position: "LW",
    from: "Barcelona", to: "Paris Saint-Germain", toLeague: "Ligue 1", leagueTier: 1,
    season: "2017/18", fee: M(222), fairLow: M(62), fairMid: M(77), fairHigh: M(94), confidence: "high" },
  { id: "t-dembele-2017", playerName: "Ousmane Dembélé", playerSlug: "ousmane-dembele", position: "RW",
    from: "Borussia Dortmund", to: "Barcelona", toLeague: "La Liga", leagueTier: 1,
    season: "2017/18", fee: M(148), fairLow: M(24), fairMid: M(33), fairHigh: M(44), confidence: "high" },
  { id: "t-mbappe-2018", playerName: "Kylian Mbappé", playerSlug: "kylian-mbappe", position: "LW",
    from: "Monaco", to: "Paris Saint-Germain", toLeague: "Ligue 1", leagueTier: 1,
    season: "2018/19", fee: M(180), fairLow: M(82), fairMid: M(101), fairHigh: M(122), confidence: "high" },
  { id: "t-coutinho-2018", playerName: "Philippe Coutinho", playerSlug: "philippe-coutinho", position: "CAM",
    from: "Liverpool", to: "Barcelona", toLeague: "La Liga", leagueTier: 1,
    season: "2017/18", fee: M(135), fairLow: M(52), fairMid: M(66), fairHigh: M(82), confidence: "high" },
  { id: "t-grealish-2021", playerName: "Jack Grealish", playerSlug: "jack-grealish", position: "LW",
    from: "Aston Villa", to: "Manchester City", toLeague: "Premier League", leagueTier: 1,
    season: "2021/22", fee: M(117), fairLow: M(46), fairMid: M(58), fairHigh: M(72), confidence: "high" },
  { id: "t-antony-2022", playerName: "Antony", playerSlug: "antony", position: "RW",
    from: "Ajax", to: "Manchester United", toLeague: "Premier League", leagueTier: 1,
    season: "2022/23", fee: M(95), fairLow: M(28), fairMid: M(38), fairHigh: M(50), confidence: "mid" },
  { id: "t-hazard-2019", playerName: "Eden Hazard", playerSlug: "eden-hazard", position: "LW",
    from: "Chelsea", to: "Real Madrid", toLeague: "La Liga", leagueTier: 1,
    season: "2019/20", fee: M(103), fairLow: M(58), fairMid: M(72), fairHigh: M(88), confidence: "mid" },
  { id: "t-pogba-2016", playerName: "Paul Pogba", playerSlug: "paul-pogba", position: "CM",
    from: "Juventus", to: "Manchester United", toLeague: "Premier League", leagueTier: 1,
    season: "2016/17", fee: M(105), fairLow: M(48), fairMid: M(62), fairHigh: M(78), confidence: "high" },
  { id: "t-caicedo-2023", playerName: "Moisés Caicedo", playerSlug: "moises-caicedo", position: "CDM",
    from: "Brighton", to: "Chelsea", toLeague: "Premier League", leagueTier: 1,
    season: "2023/24", fee: M(133), fairLow: M(52), fairMid: M(68), fairHigh: M(86), confidence: "mid" },
  { id: "t-enzo-2023", playerName: "Enzo Fernández", playerSlug: "enzo-fernandez", position: "CM",
    from: "Benfica", to: "Chelsea", toLeague: "Premier League", leagueTier: 1,
    season: "2022/23", fee: M(121), fairLow: M(48), fairMid: M(62), fairHigh: M(78), confidence: "mid" },
  { id: "t-hojlund-2023", playerName: "Rasmus Højlund", playerSlug: "rasmus-hojlund", position: "ST",
    from: "Atalanta", to: "Manchester United", toLeague: "Premier League", leagueTier: 1,
    season: "2023/24", fee: M(72), fairLow: M(28), fairMid: M(40), fairHigh: M(56), confidence: "low" },
  { id: "t-lukaku-2021", playerName: "Romelu Lukaku", playerSlug: "romelu-lukaku", position: "ST",
    from: "Inter", to: "Chelsea", toLeague: "Premier League", leagueTier: 1,
    season: "2021/22", fee: M(113), fairLow: M(52), fairMid: M(66), fairHigh: M(82), confidence: "high" },
  { id: "t-maguire-2019", playerName: "Harry Maguire", playerSlug: "harry-maguire", position: "CB",
    from: "Leicester", to: "Manchester United", toLeague: "Premier League", leagueTier: 1,
    season: "2019/20", fee: M(87), fairLow: M(32), fairMid: M(44), fairHigh: M(58), confidence: "high" },

  // Steals (underpaid)
  { id: "t-salah-2017", playerName: "Mohamed Salah", playerSlug: "mohamed-salah", position: "RW",
    from: "Roma", to: "Liverpool", toLeague: "Premier League", leagueTier: 1,
    season: "2017/18", fee: M(42), fairLow: M(92), fairMid: M(118), fairHigh: M(148), confidence: "high" },
  { id: "t-kante-2016", playerName: "N'Golo Kanté", playerSlug: "n-golo-kante", position: "CDM",
    from: "Leicester", to: "Chelsea", toLeague: "Premier League", leagueTier: 1,
    season: "2016/17", fee: M(32), fairLow: M(64), fairMid: M(82), fairHigh: M(102), confidence: "high" },
  { id: "t-haaland-2022", playerName: "Erling Haaland", playerSlug: "erling-haaland", position: "ST",
    from: "Borussia Dortmund", to: "Manchester City", toLeague: "Premier League", leagueTier: 1,
    season: "2022/23", fee: M(60), fairLow: M(138), fairMid: M(170), fairHigh: M(204), confidence: "high" },
  { id: "t-rudiger-2022", playerName: "Antonio Rüdiger", playerSlug: "antonio-rudiger", position: "CB",
    from: "Chelsea", to: "Real Madrid", toLeague: "La Liga", leagueTier: 1,
    season: "2022/23", fee: 0, fairLow: M(48), fairMid: M(60), fairHigh: M(74), confidence: "high" },
  { id: "t-vvd-2018", playerName: "Virgil van Dijk", playerSlug: "virgil-van-dijk", position: "CB",
    from: "Southampton", to: "Liverpool", toLeague: "Premier League", leagueTier: 1,
    season: "2017/18", fee: M(84), fairLow: M(118), fairMid: M(142), fairHigh: M(170), confidence: "high" },
  { id: "t-mbappe-2024", playerName: "Kylian Mbappé", playerSlug: "kylian-mbappe", position: "LW",
    from: "Paris Saint-Germain", to: "Real Madrid", toLeague: "La Liga", leagueTier: 1,
    season: "2024/25", fee: 0, fairLow: M(155), fairMid: M(178), fairHigh: M(202), confidence: "high" },
  { id: "t-alaba-2021", playerName: "David Alaba", playerSlug: "david-alaba", position: "CB",
    from: "Bayern Munich", to: "Real Madrid", toLeague: "La Liga", leagueTier: 1,
    season: "2021/22", fee: 0, fairLow: M(52), fairMid: M(66), fairHigh: M(82), confidence: "high" },
  { id: "t-dias-2020", playerName: "Rúben Dias", playerSlug: "ruben-dias", position: "CB",
    from: "Benfica", to: "Manchester City", toLeague: "Premier League", leagueTier: 1,
    season: "2020/21", fee: M(68), fairLow: M(96), fairMid: M(118), fairHigh: M(142), confidence: "high" },
  { id: "t-saliba-2019", playerName: "William Saliba", playerSlug: "william-saliba", position: "CB",
    from: "Saint-Étienne", to: "Arsenal", toLeague: "Premier League", leagueTier: 1,
    season: "2019/20", fee: M(30), fairLow: M(58), fairMid: M(74), fairHigh: M(92), confidence: "mid" },
  { id: "t-palmer-2023", playerName: "Cole Palmer", playerSlug: "cole-palmer", position: "CAM",
    from: "Manchester City", to: "Chelsea", toLeague: "Premier League", leagueTier: 1,
    season: "2023/24", fee: M(45), fairLow: M(78), fairMid: M(102), fairHigh: M(130), confidence: "mid" },
  { id: "t-fofana-2024", playerName: "Youssouf Fofana", playerSlug: "youssouf-fofana", position: "CDM",
    from: "Monaco", to: "AC Milan", toLeague: "Serie A", leagueTier: 1,
    season: "2024/25", fee: M(20), fairLow: M(38), fairMid: M(48), fairHigh: M(60), confidence: "high" },
  { id: "t-guehi-2021", playerName: "Marc Guéhi", playerSlug: "marc-guehi", position: "CB",
    from: "Chelsea", to: "Crystal Palace", toLeague: "Premier League", leagueTier: 1,
    season: "2021/22", fee: M(20), fairLow: M(42), fairMid: M(54), fairHigh: M(68), confidence: "mid" },
  { id: "t-mac-allister-2023", playerName: "Alexis Mac Allister", playerSlug: "alexis-mac-allister", position: "CM",
    from: "Brighton", to: "Liverpool", toLeague: "Premier League", leagueTier: 1,
    season: "2023/24", fee: M(42), fairLow: M(68), fairMid: M(84), fairHigh: M(102), confidence: "high" },
  { id: "t-szoboszlai-2023", playerName: "Dominik Szoboszlai", playerSlug: "dominik-szoboszlai", position: "CAM",
    from: "RB Leipzig", to: "Liverpool", toLeague: "Premier League", leagueTier: 1,
    season: "2023/24", fee: M(70), fairLow: M(88), fairMid: M(106), fairHigh: M(128), confidence: "high" },
  { id: "t-nunez-2022", playerName: "Darwin Núñez", playerSlug: "darwin-nunez", position: "ST",
    from: "Benfica", to: "Liverpool", toLeague: "Premier League", leagueTier: 1,
    season: "2022/23", fee: M(75), fairLow: M(36), fairMid: M(48), fairHigh: M(62), confidence: "mid" },
  { id: "t-havertz-2020", playerName: "Kai Havertz", playerSlug: "kai-havertz", position: "CAM",
    from: "Bayer Leverkusen", to: "Chelsea", toLeague: "Premier League", leagueTier: 1,
    season: "2020/21", fee: M(80), fairLow: M(42), fairMid: M(54), fairHigh: M(68), confidence: "high" },
  { id: "t-sancho-2021", playerName: "Jadon Sancho", playerSlug: "jadon-sancho", position: "RW",
    from: "Borussia Dortmund", to: "Manchester United", toLeague: "Premier League", leagueTier: 1,
    season: "2021/22", fee: M(85), fairLow: M(46), fairMid: M(58), fairHigh: M(72), confidence: "high" },
];

export function transferDelta(t: TransferRow) {
  return t.fee - t.fairMid;      // positive = overpaid
}
export function transferDeltaPct(t: TransferRow) {
  if (t.fairMid <= 0) return 0;
  return (t.fee - t.fairMid) / t.fairMid;
}
