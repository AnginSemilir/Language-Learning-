// What each level brings to Pulau Kata: a building, or a place, each with
// its Indonesian name.

export interface Building {
  id: string;
  /** The level that brings it. */
  level: number;
  /** Its name in Indonesian, and in English. */
  word: string;
  meaning: string;
}

export const BUILDINGS: Building[] = [
  { id: "rumah", level: 2, word: "rumah", meaning: "house" },
  { id: "kebun", level: 3, word: "kebun", meaning: "garden" },
  { id: "perahu", level: 4, word: "perahu", meaning: "boat" },
  { id: "warung", level: 5, word: "warung", meaning: "food stall" },
  { id: "dermaga", level: 6, word: "dermaga", meaning: "jetty" },
  { id: "sawah", level: 7, word: "sawah", meaning: "rice field" },
  { id: "pasar", level: 8, word: "pasar", meaning: "market" },
  {
    id: "pulau-seberang",
    level: 9,
    word: "pulau seberang",
    meaning: "the island across",
  },
  { id: "sekolah", level: 10, word: "sekolah", meaning: "school" },
  { id: "mercusuar", level: 12, word: "mercusuar", meaning: "lighthouse" },
  { id: "gunung", level: 14, word: "gunung", meaning: "mountain" },
  { id: "pura", level: 15, word: "pura", meaning: "temple" },
  { id: "air-terjun", level: 16, word: "air terjun", meaning: "waterfall" },
  { id: "bianglala", level: 18, word: "bianglala", meaning: "Ferris wheel" },
  {
    id: "balon-udara",
    level: 20,
    word: "balon udara",
    meaning: "hot-air balloon",
  },
  { id: "pelangi", level: 25, word: "pelangi", meaning: "rainbow" },
  { id: "kembang-api", level: 30, word: "kembang api", meaning: "fireworks" },
];
