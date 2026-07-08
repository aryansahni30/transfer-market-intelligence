// Similarity map data: for each anchor slug, a list of similar players with
// 2D style coordinates (progressive-passing x box-threat) and similarity score.

export interface SimNode {
  slug: string;
  name: string;
  club: string;
  age: number;
  marketValue: number;   // €
  x: number;             // 0..1  progressive passing
  y: number;             // 0..1  box threat
  minutes: number;       // last-season minutes
  similarity: number;    // 0..1
}

const M = (n: number) => n * 1_000_000;

export const similarityMap: Record<string, { anchor: SimNode; nodes: SimNode[] }> = {
  "erling-haaland": {
    anchor: { slug: "erling-haaland", name: "Erling Haaland", club: "Manchester City", age: 25, marketValue: M(200), x: 0.30, y: 0.80, minutes: 2680, similarity: 1 },
    nodes: [
      { slug: "alexander-isak", name: "Alexander Isak", club: "Newcastle", age: 26, marketValue: M(120), x: 0.52, y: 0.72, minutes: 2410, similarity: 0.91 },
      { slug: "victor-osimhen", name: "Victor Osimhen", club: "Galatasaray", age: 26, marketValue: M(75), x: 0.38, y: 0.76, minutes: 2200, similarity: 0.89 },
      { slug: "benjamin-sesko", name: "Benjamin Šeško", club: "RB Leipzig", age: 22, marketValue: M(75), x: 0.34, y: 0.62, minutes: 1980, similarity: 0.86 },
      { slug: "viktor-gyokeres", name: "Viktor Gyökeres", club: "Arsenal", age: 27, marketValue: M(75), x: 0.44, y: 0.68, minutes: 2620, similarity: 0.84 },
      { slug: "lois-openda", name: "Loïs Openda", club: "RB Leipzig", age: 25, marketValue: M(45), x: 0.62, y: 0.58, minutes: 2510, similarity: 0.82 },
      { slug: "jonathan-david", name: "Jonathan David", club: "Juventus", age: 25, marketValue: M(45), x: 0.68, y: 0.56, minutes: 2740, similarity: 0.81 },
      { slug: "darwin-nunez", name: "Darwin Núñez", club: "Liverpool", age: 26, marketValue: M(50), x: 0.48, y: 0.66, minutes: 1620, similarity: 0.78 },
      { slug: "rasmus-hojlund", name: "Rasmus Højlund", club: "Manchester United", age: 22, marketValue: M(35), x: 0.42, y: 0.50, minutes: 2140, similarity: 0.76 },
      { slug: "hugo-ekitike", name: "Hugo Ekitiké", club: "Eintracht Frankfurt", age: 23, marketValue: M(40), x: 0.56, y: 0.52, minutes: 2050, similarity: 0.74 },
      { slug: "santiago-gimenez", name: "Santiago Giménez", club: "AC Milan", age: 24, marketValue: M(40), x: 0.36, y: 0.68, minutes: 2280, similarity: 0.73 },
      { slug: "artem-dovbyk", name: "Artem Dovbyk", club: "Roma", age: 28, marketValue: M(35), x: 0.58, y: 0.62, minutes: 2360, similarity: 0.70 },
      { slug: "jonathan-burkardt", name: "Jonathan Burkardt", club: "Mainz 05", age: 25, marketValue: M(25), x: 0.50, y: 0.42, minutes: 2100, similarity: 0.66 },
    ],
  },
  "jude-bellingham": {
    anchor: { slug: "jude-bellingham", name: "Jude Bellingham", club: "Real Madrid", age: 22, marketValue: M(180), x: 0.76, y: 0.62, minutes: 2820, similarity: 1 },
    nodes: [
      { slug: "florian-wirtz", name: "Florian Wirtz", club: "Bayer Leverkusen", age: 22, marketValue: M(150), x: 0.82, y: 0.56, minutes: 2680, similarity: 0.90 },
      { slug: "pedri", name: "Pedri", club: "Barcelona", age: 23, marketValue: M(100), x: 0.86, y: 0.42, minutes: 2340, similarity: 0.82 },
      { slug: "cole-palmer", name: "Cole Palmer", club: "Chelsea", age: 23, marketValue: M(140), x: 0.72, y: 0.66, minutes: 2900, similarity: 0.81 },
      { slug: "dominik-szoboszlai", name: "Dominik Szoboszlai", club: "Liverpool", age: 25, marketValue: M(65), x: 0.70, y: 0.54, minutes: 2560, similarity: 0.78 },
      { slug: "martin-odegaard", name: "Martin Ødegaard", club: "Arsenal", age: 26, marketValue: M(100), x: 0.84, y: 0.50, minutes: 2380, similarity: 0.76 },
      { slug: "xavi-simons", name: "Xavi Simons", club: "RB Leipzig", age: 22, marketValue: M(80), x: 0.78, y: 0.58, minutes: 2210, similarity: 0.75 },
      { slug: "arda-guler", name: "Arda Güler", club: "Real Madrid", age: 20, marketValue: M(45), x: 0.80, y: 0.48, minutes: 1240, similarity: 0.68 },
      { slug: "kenan-yildiz", name: "Kenan Yıldız", club: "Juventus", age: 20, marketValue: M(50), x: 0.74, y: 0.52, minutes: 2020, similarity: 0.66 },
    ],
  },
  "william-saliba": {
    anchor: { slug: "william-saliba", name: "William Saliba", club: "Arsenal", age: 24, marketValue: M(80), x: 0.68, y: 0.14, minutes: 3060, similarity: 1 },
    nodes: [
      { slug: "josko-gvardiol", name: "Joško Gvardiol", club: "Manchester City", age: 23, marketValue: M(90), x: 0.72, y: 0.20, minutes: 2740, similarity: 0.88 },
      { slug: "ruben-dias", name: "Rúben Dias", club: "Manchester City", age: 28, marketValue: M(70), x: 0.66, y: 0.16, minutes: 2560, similarity: 0.85 },
      { slug: "antonio-rudiger", name: "Antonio Rüdiger", club: "Real Madrid", age: 32, marketValue: M(25), x: 0.62, y: 0.18, minutes: 2830, similarity: 0.80 },
      { slug: "marc-guehi", name: "Marc Guéhi", club: "Crystal Palace", age: 25, marketValue: M(50), x: 0.58, y: 0.14, minutes: 3010, similarity: 0.77 },
      { slug: "goncalo-inacio", name: "Gonçalo Inácio", club: "Sporting CP", age: 24, marketValue: M(45), x: 0.70, y: 0.18, minutes: 2680, similarity: 0.75 },
      { slug: "castello-lukeba", name: "Castello Lukeba", club: "RB Leipzig", age: 22, marketValue: M(35), x: 0.64, y: 0.12, minutes: 2540, similarity: 0.72 },
      { slug: "murillo", name: "Murillo", club: "Nottingham Forest", age: 22, marketValue: M(40), x: 0.60, y: 0.20, minutes: 2820, similarity: 0.70 },
    ],
  },
};

export const defaultSimilarSlug = "erling-haaland";
