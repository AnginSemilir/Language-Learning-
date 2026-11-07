// Rahasia Pulau Kata, the island's secret: a mystery that unfolds as the
// island grows. Each step waits for a level, and then for you: tap the
// right place on the island (some only after sunset), answer a riddle in
// Indonesian, or open the right bottle. The steps you've done are kept in
// a setting (#world_story), so they follow you to every device.

import { sameKey } from "./gameWords";
import { chance } from "./journey";
import type { DayPhase } from "./world";

/**
 * How a step happens: by itself once its level is reached ("auto"), by
 * tapping something on the island (perhaps only at some times of day), by
 * answering a riddle in Indonesian (the English is a near miss), or by
 * opening the next bottle that washes up.
 */
export type StoryTrigger =
  | { kind: "auto" }
  | { kind: "tap"; target: string; phases?: DayPhase[] }
  | { kind: "riddle"; answers: string[]; english: string[] }
  | { kind: "bottle" };

export interface StoryStep {
  id: string;
  chapter: number;
  title: string;
  titleEn: string;
  level: number;
  trigger: StoryTrigger;
  /** While this is the next step: a nudge, in Indonesian and English. */
  clue: string;
  clueEn: string;
  /** For a riddle: the question, in Indonesian and English. */
  riddle?: [string, string];
  /** What you find. */
  text: string;
  textEn: string;
  /** The piece of the old map found here (1 to 4). */
  mapPiece?: number;
}

const AFTER_SUNSET: DayPhase[] = ["dusk", "night"];

export const STORY: StoryStep[] = [
  {
    id: "jejak",
    chapter: 1,
    title: "Jejak di Pasir",
    titleEn: "Footprints in the Sand",
    level: 2,
    trigger: { kind: "auto" },
    clue: "",
    clueEn: "",
    text: "Pagi ini ada jejak kaki di pantai. Jejaknya datang dari laut dan berhenti di dekat api unggun. Siapa yang datang tadi malam?",
    textEn:
      "This morning there are footprints on the beach. They come out of the sea and stop by the campfire. Who came last night?",
  },
  {
    id: "abu",
    chapter: 2,
    title: "Abu yang Hangat",
    titleEn: "Warm Ashes",
    level: 2,
    trigger: { kind: "tap", target: "api-unggun" },
    clue: "Jejaknya berhenti di dekat api unggun…",
    clueEn: "The footprints stop by the campfire… Tap it on the island.",
    text: "Di dalam abu yang masih hangat ada kertas tua. Ada teka-teki di kertas itu.",
    textEn:
      "In the still-warm ashes there's an old piece of paper, with a riddle on it.",
  },
  {
    id: "peta",
    chapter: 2,
    title: "Abu yang Hangat",
    titleEn: "Warm Ashes",
    level: 2,
    trigger: { kind: "riddle", answers: ["peta"], english: ["map"] },
    clue: "Jawab teka-teki di kertas itu.",
    clueEn: "Answer the riddle on the paper.",
    riddle: [
      "Aku punya kota, tapi tidak punya rumah. Aku punya sungai, tapi tidak punya air. Apa aku?",
      "I have cities, but no houses. I have rivers, but no water. What am I?",
    ],
    text: "Ini sepotong peta! Ada gambar pulau ini… dan separuh tanda X.",
    textEn: "It's a piece of a map! It shows this island… and half of an X.",
    mapPiece: 1,
  },
  {
    id: "asing",
    chapter: 3,
    title: "Orang Asing",
    titleEn: "The Stranger",
    level: 5,
    trigger: { kind: "tap", target: "warung" },
    clue: "Di warung, orang suka bercerita…",
    clueEn: "People love to talk at the food stall… It opens at level 5.",
    text: "Bu Dewi berbisik: 'Tadi malam aku melihat orang asing membawa lampu biru. Dia berjalan ke dermaga.'",
    textEn:
      "Dewi whispers: 'Last night I saw a stranger carrying a blue lamp. They walked to the jetty.'",
  },
  {
    id: "lampu",
    chapter: 4,
    title: "Lampu Biru",
    titleEn: "The Blue Lamp",
    level: 6,
    trigger: { kind: "tap", target: "dermaga", phases: AFTER_SUNSET },
    clue: "Lampu biru hanya terlihat setelah matahari terbenam…",
    clueEn:
      "The blue lamp only shows after sunset… The jetty comes at level 6.",
    text: "Di ujung dermaga ada botol berpita biru. Di dalamnya ada potongan peta kedua dan sebuah pesan: 'Kata-kata adalah kuncinya.'",
    textEn:
      "At the end of the jetty there's a bottle tied with a blue ribbon. Inside: the second piece of the map, and a note: 'Words are the key.'",
    mapPiece: 2,
  },
  {
    id: "buku",
    chapter: 5,
    title: "Buku Harian",
    titleEn: "The Diary",
    level: 10,
    trigger: { kind: "tap", target: "sekolah" },
    clue: "Siapa yang menyimpan buku-buku tua di pulau ini?",
    clueEn: "Who keeps old books on this island? Look at level 10.",
    text: "Pak Guru menemukan buku harian tua di sekolah. Halaman terakhirnya hilang. Di halaman sebelumnya tertulis: 'Halaman terakhir kusimpan di dalam sesuatu yang punya leher, tapi tidak punya kepala.'",
    textEn:
      "The teacher found an old diary at the school. Its last page is missing. The page before says: 'I kept the last page inside something that has a neck, but no head.'",
  },
  {
    id: "botol",
    chapter: 5,
    title: "Buku Harian",
    titleEn: "The Diary",
    level: 10,
    trigger: { kind: "riddle", answers: ["botol"], english: ["bottle"] },
    clue: "Jawab teka-teki di buku harian.",
    clueEn: "Answer the riddle in the diary.",
    riddle: [
      "Aku punya leher, tapi tidak punya kepala. Apa aku?",
      "I have a neck, but no head. What am I?",
    ],
    text: "Botol! Mungkin halaman itu ada di dalam botol berikutnya yang terdampar di pantai.",
    textEn:
      "A bottle! Perhaps the page is in the next bottle that washes up on the beach.",
  },
  {
    id: "halaman",
    chapter: 6,
    title: "Halaman Terakhir",
    titleEn: "The Last Page",
    level: 10,
    trigger: { kind: "bottle" },
    clue: "Tunggu botol berikutnya di pantai, lalu bukalah.",
    clueEn: "Wait for the next bottle on the beach, then open it.",
    text: "Halaman yang hilang ada di dalam botol! Tertulis: 'Namaku Nenek Laut. Aku menjaga pulau ini sebelum kamu datang. Hartaku tersimpan di tempat yang matanya bersinar pada malam hari.'",
    textEn:
      "The missing page was in the bottle! It says: 'My name is Grandmother Sea. I looked after this island before you came. My treasure is kept in the place whose eye shines at night.'",
    mapPiece: 3,
  },
  {
    id: "mercusuar",
    chapter: 6,
    title: "Halaman Terakhir",
    titleEn: "The Last Page",
    level: 10,
    trigger: {
      kind: "riddle",
      answers: ["mercusuar"],
      english: ["lighthouse"],
    },
    clue: "Tempat apa yang matanya bersinar pada malam hari?",
    clueEn: "What place has an eye that shines at night?",
    riddle: [
      "Siang hari aku tidur, malam hari aku bekerja. Mataku cuma satu, tapi terang sekali. Apa aku?",
      "By day I sleep, by night I work. I have only one eye, but it's very bright. What am I?",
    ],
    text: "Mercusuar! Nenek Laut pasti pernah naik ke atas sana.",
    textEn: "The lighthouse! Grandmother Sea must have climbed up there.",
  },
  {
    id: "puncak",
    chapter: 7,
    title: "Mata yang Bersinar",
    titleEn: "The Shining Eye",
    level: 12,
    trigger: { kind: "tap", target: "mercusuar", phases: AFTER_SUNSET },
    clue: "Naik ke mercusuar saat lampunya menyala…",
    clueEn:
      "Climb the lighthouse while its light is on… Level 12, after sunset.",
    text: "Di puncak mercusuar ada peti kecil. Isinya potongan peta terakhir! Sekarang petanya lengkap, dan tanda X ada di… gunung.",
    textEn:
      "At the top of the lighthouse there's a little chest, with the last piece of the map inside! Now the map is whole, and the X is on… the mountain.",
    mapPiece: 4,
  },
  {
    id: "pintu",
    chapter: 8,
    title: "Pintu Batu",
    titleEn: "The Stone Door",
    level: 14,
    trigger: { kind: "tap", target: "gunung" },
    clue: "Tanda X ada di gunung…",
    clueEn: "The X is on the mountain… It rises at level 14.",
    text: "Di kaki gunung ada pintu batu dengan tulisan kuno: 'Jawablah, maka pintu akan terbuka.'",
    textEn:
      "At the foot of the mountain there's a stone door with an old inscription: 'Answer, and the door will open.'",
  },
  {
    id: "lubang",
    chapter: 9,
    title: "Gua Rahasia",
    titleEn: "The Secret Cave",
    level: 14,
    trigger: { kind: "riddle", answers: ["lubang"], english: ["hole"] },
    clue: "Jawab tulisan di pintu batu.",
    clueEn: "Answer the words on the stone door.",
    riddle: [
      "Makin banyak kamu ambil, makin besar aku. Apa aku?",
      "The more you take away, the bigger I get. What am I?",
    ],
    text: "Pintu batu terbuka. Di dalam gua ada kristal yang bersinar dan sebuah buku emas: Kamus Emas. Di halaman pertamanya tertulis namamu.",
    textEn:
      "The stone door opens. Inside the cave are glowing crystals and a golden book: the Golden Dictionary. Your name is written on its first page.",
  },
  {
    id: "nenek",
    chapter: 10,
    title: "Nenek Laut",
    titleEn: "Grandmother Sea",
    level: 14,
    trigger: { kind: "tap", target: "orang-asing", phases: AFTER_SUNSET },
    clue: "Orang asing dengan lampu biru kembali ke pantai malam ini…",
    clueEn:
      "The stranger with the blue lamp is back on the beach tonight… After sunset.",
    text: "Orang asing itu membuka tudungnya. Ternyata dia Nenek Laut! 'Terima kasih sudah merawat pulau ini,' katanya. 'Sekarang kamulah penjaganya.' Lalu dia menunjuk ke pulau seberang. 'Di sana ada rahasia lain…'",
    textEn:
      "The stranger lowers her hood. It's Grandmother Sea! 'Thank you for looking after this island,' she says. 'Now you are its keeper.' Then she points to the island across the water. 'There's another secret over there…'",
  },
];

/** The steps done, as the setting stores them (ids, comma-separated). */
export function parseStory(value: string | undefined): Set<string> {
  return new Set((value ?? "").split(",").filter(Boolean));
}

export function storyValue(done: Set<string>): string {
  return [...done].join(",");
}

export interface StoryState {
  done: StoryStep[];
  /** The step that comes next, or null when the story is over. */
  next: StoryStep | null;
  /** Whether the next step's level has been reached. */
  ready: boolean;
  /** Pieces of the old map found, 0 to 4. */
  mapPieces: number;
  /** The cave is open and the golden tree has grown. */
  treasure: boolean;
  /** The stranger with the blue lamp has been heard of and not yet met. */
  stranger: boolean;
  finished: boolean;
}

/** Where the story stands, from the steps done and your level. */
export function storyState(done: Set<string>, level: number): StoryState {
  const steps: StoryStep[] = [];
  let next: StoryStep | null = null;
  for (const step of STORY) {
    const auto = step.trigger.kind === "auto" && level >= step.level;
    if (!auto && !done.has(step.id)) {
      next = step;
      break;
    }
    steps.push(step);
  }
  const has = (id: string) => steps.some((s) => s.id === id);
  return {
    done: steps,
    next,
    ready: !!next && level >= next.level,
    mapPieces: Math.max(0, ...steps.map((s) => s.mapPiece ?? 0)),
    treasure: has("lubang"),
    stranger: has("asing") && !has("nenek"),
    finished: next === null,
  };
}

/** Where a blue light is seen at night, while the story leads there. */
export function blueLight(story: StoryState): "dermaga" | "mercusuar" | null {
  if (!story.ready) return null;
  if (story.next?.id === "lampu") return "dermaga";
  if (story.next?.id === "puncak") return "mercusuar";
  return null;
}

/**
 * Whether the stranger is on the beach tonight: on about half the nights
 * once you've heard of her, and every night when she's waiting for you.
 */
export function strangerOut(story: StoryState, date: string): boolean {
  if (!story.stranger) return false;
  if (story.next?.id === "nenek") return story.ready;
  return chance(`${date}|asing`) < 0.5;
}

/** Whether tapping this thing, now, is the next step. */
export function tapAdvances(
  story: StoryState,
  target: string,
  phase: DayPhase
): boolean {
  const trigger = story.next?.trigger;
  if (!story.ready || trigger?.kind !== "tap") return false;
  if (trigger.target !== target) return false;
  return !trigger.phases || trigger.phases.includes(phase);
}

export type Answer = "right" | "english" | "wrong";

/** Checks an answer to a riddle ("sebuah peta" is right as well). */
export function checkAnswer(step: StoryStep, input: string): Answer {
  if (step.trigger.kind !== "riddle") return "wrong";
  const words = sameKey(input).split(" ");
  const has = (word: string) => words.includes(sameKey(word));
  if (step.trigger.answers.some(has)) return "right";
  if (step.trigger.english.some(has)) return "english";
  return "wrong";
}

/** A hint after some wrong answers: the first letter, its length, English. */
export function riddleHint(step: StoryStep, wrong: number): string | null {
  if (step.trigger.kind !== "riddle" || wrong < 1) return null;
  const answer = step.trigger.answers[0];
  const first = answer[0].toUpperCase();
  if (wrong === 1) return `Huruf pertama: ${first}`;
  if (wrong === 2) {
    const blanks = Array.from(answer.slice(1), () => "_").join(" ");
    return `${answer.length} huruf: ${first} ${blanks}`;
  }
  return `In English it's "${step.trigger.english[0]}". In Indonesian?`;
}
