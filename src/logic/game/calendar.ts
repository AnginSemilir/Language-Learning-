// The island's days: the season, the weather and what's going on, all from
// the date (the same for everyone, and on every device), and the days worth
// celebrating, from the calendar and from your own history.

import { chance } from "./journey";

export type Season = "hujan" | "kemarau" | "pancaroba";

export type Weather = "cerah" | "berawan" | "gerimis" | "hujan" | "badai";

/** Words for the weather and seasons, in Indonesian and English. */
export const WEATHER_WORDS: Record<Weather, [string, string]> = {
  cerah: ["cerah", "clear skies"],
  berawan: ["berawan", "cloudy"],
  gerimis: ["gerimis", "drizzle"],
  hujan: ["hujan", "rain"],
  badai: ["badai", "storm"],
};

export const SEASON_WORDS: Record<Season, [string, string]> = {
  hujan: ["musim hujan", "the rainy season"],
  kemarau: ["musim kemarau", "the dry season"],
  pancaroba: ["musim pancaroba", "the turn of the seasons"],
};

/** Rain from November to March, dry from May to September. */
export function seasonOf(date: string): Season {
  const month = Number(date.slice(5, 7));
  if (month >= 11 || month <= 3) return "hujan";
  if (month >= 5 && month <= 9) return "kemarau";
  return "pancaroba";
}

const WEATHER_ODDS: Record<Season, [Weather, number][]> = {
  hujan: [
    ["badai", 0.06],
    ["hujan", 0.3],
    ["gerimis", 0.17],
    ["berawan", 0.17],
  ],
  pancaroba: [
    ["badai", 0.03],
    ["hujan", 0.17],
    ["gerimis", 0.13],
    ["berawan", 0.22],
  ],
  kemarau: [
    ["badai", 0.01],
    ["hujan", 0.06],
    ["gerimis", 0.08],
    ["berawan", 0.2],
  ],
};

/** The day's weather, likelier to rain in the rainy season. */
export function weatherFor(date: string): Weather {
  let roll = chance(`${date}|cuaca`);
  for (const [weather, odds] of WEATHER_ODDS[seasonOf(date)]) {
    if (roll < odds) return weather;
    roll -= odds;
  }
  return "cerah";
}

/** Morning mist over the sea, on about one day in five. */
export function mistFor(date: string): boolean {
  return chance(`${date}|kabut`) < 0.2;
}

export interface IslandEvent {
  id: string;
  word: string;
  meaning: string;
  line: string;
  lineEn: string;
}

export const EVENTS: Record<string, IslandEvent> = {
  "layang-layang": {
    id: "layang-layang",
    word: "layang-layang",
    meaning: "kites",
    line: "Anak-anak bermain layang-layang di pantai.",
    lineEn: "The children are flying kites on the beach.",
  },
  nelayan: {
    id: "nelayan",
    word: "nelayan",
    meaning: "fishermen",
    line: "Para nelayan pulang saat senja.",
    lineEn: "The fishermen come home at dusk.",
  },
  "pasar-malam": {
    id: "pasar-malam",
    word: "pasar malam",
    meaning: "night market",
    line: "Malam Minggu! Ada pasar malam di desa.",
    lineEn: "It's Saturday night! There's a night market in the village.",
  },
  pelangi: {
    id: "pelangi",
    word: "pelangi",
    meaning: "rainbow",
    line: "Gerimis dan matahari: ada pelangi!",
    lineEn: "Drizzle and sunshine: there's a rainbow!",
  },
};

const KITE_ODDS: Record<Season, number> = {
  kemarau: 0.35,
  pancaroba: 0.2,
  hujan: 0.1,
};

/** What's going on today, besides the weather, at this level. */
export function eventsFor(date: string, level: number): string[] {
  const weather = weatherFor(date);
  const dry = weather === "cerah" || weather === "berawan";
  const events: string[] = [];
  const kites = chance(`${date}|layang`) < KITE_ODDS[seasonOf(date)];
  if (level >= 3 && dry && kites) events.push("layang-layang");
  if (level >= 4 && weather !== "badai" && chance(`${date}|nelayan`) < 0.3) {
    events.push("nelayan");
  }
  const saturday = new Date(`${date}T12:00:00Z`).getUTCDay() === 6;
  if (level >= 8 && saturday) events.push("pasar-malam");
  if (weather === "gerimis" && chance(`${date}|pelangi`) < 0.6) {
    events.push("pelangi");
  }
  return events;
}

export interface Celebration {
  id: string;
  word: string;
  meaning: string;
  line: string;
  lineEn: string;
  hint: string;
}

export const CELEBRATIONS: Celebration[] = [
  {
    id: "tahun-baru",
    word: "Tahun Baru",
    meaning: "New Year",
    line: "Selamat Tahun Baru! Ada kembang api di seluruh pulau.",
    lineEn: "Happy New Year! There are fireworks all over the island.",
    hint: "Study on 1 January.",
  },
  {
    id: "kemerdekaan",
    word: "Hari Kemerdekaan",
    meaning: "Independence Day",
    line: "Dirgahayu Indonesia! Bendera merah putih berkibar di desa.",
    lineEn: "Long live Indonesia! The red and white flag flies in the village.",
    hint: "Study on 17 August.",
  },
  {
    id: "hari-batik",
    word: "Hari Batik",
    meaning: "Batik Day",
    line: "Hari ini semua orang di desa memakai batik.",
    lineEn: "Today everyone in the village is wearing batik.",
    hint: "Study on 2 October.",
  },
  {
    id: "ulang-tahun",
    word: "ulang tahun pulau",
    meaning: "the island's birthday",
    line: "Selamat ulang tahun, Pulau Kata! Ada kue di pantai.",
    lineEn: "Happy birthday, Pulau Kata! There's a cake on the beach.",
    hint: "Study on the day, a year after your first.",
  },
  {
    id: "seratus-hari",
    word: "seratus hari",
    meaning: "a hundred days",
    line: "Seratus hari belajar! Desa membuat pesta untukmu.",
    lineEn: "A hundred days of study! The village throws you a party.",
    hint: "Study on a hundred different days.",
  },
];

const FIXED_DATES: Record<string, string> = {
  "01-01": "tahun-baru",
  "08-17": "kemerdekaan",
  "10-02": "hari-batik",
};

/**
 * The celebration on a day, if any: a holiday, the island's birthday (the
 * date of your first study day, a year or more on), or your 100th study day.
 */
export function celebrationOn(
  date: string,
  firstDay: string | undefined,
  studyDays: number
): string | undefined {
  if (studyDays === 100) return "seratus-hari";
  if (firstDay && date > firstDay && date.slice(5) === firstDay.slice(5)) {
    return "ulang-tahun";
  }
  return FIXED_DATES[date.slice(5)];
}
