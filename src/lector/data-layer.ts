// Client-side replacement for Lector's src/lib/data-layer.ts (heuwels/lector,
// AGPL-3.0-only). Lector's functions call its Hono API; these keep the same
// names and shapes but read and write the browser's IndexedDB through Dexie.

import { db } from "@/logic/db";
import { v4 as uuidv4 } from "uuid";
import { id as pack } from "./languages/id/manifest";
import { dateStringInTimeZone } from "./lib/dates";
import { foldWord } from "./lib/languages";
import type {
  ClozeCollection,
  ClozeMasteryLevel,
  ClozeSentence,
  DailyStats,
  Lesson,
  VocabEntry,
  WordState,
} from "./types";

export type { ClozeMasteryLevel } from "./types";

// ── Dates ──────────────────────────────────────────────────────────────────

export function localTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function todayKey(date = new Date()) {
  return dateStringInTimeZone(date, localTimeZone());
}

// ── Daily stats ────────────────────────────────────────────────────────────

type CountField = Exclude<keyof DailyStats, "date">;

function emptyDay(date: string): DailyStats {
  return {
    date,
    wordsRead: 0,
    newWordsSaved: 0,
    wordsMarkedKnown: 0,
    minutesRead: 0,
    clozePracticed: 0,
    points: 0,
    dictionaryLookups: 0,
    ankiReviews: 0,
  };
}

export async function incrementDailyStat(
  field: CountField,
  by = 1
): Promise<boolean> {
  try {
    const date = todayKey();
    await db.transaction("rw", db.dailyStats, async () => {
      const row = (await db.dailyStats.get(date)) ?? emptyDay(date);
      row[field] += by;
      await db.dailyStats.put(row);
    });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export function getAllDailyStats(): Promise<DailyStats[]> {
  return db.dailyStats.toArray();
}

// ── Vocabulary ─────────────────────────────────────────────────────────────

export function vocabKey(word: string) {
  return foldWord(word, pack);
}

export async function getKnownWordsMap(): Promise<Map<string, WordState>> {
  const rows = await db.vocab.toArray();
  return new Map(rows.map((r) => [r.text, r.state]));
}

export function getVocabByText(text: string) {
  return db.vocab.where("text").equals(vocabKey(text)).first();
}

export async function saveVocab(
  entry: Omit<VocabEntry, "id" | "createdAt" | "stateUpdatedAt" | "text"> & {
    text: string;
  }
): Promise<VocabEntry> {
  const text = vocabKey(entry.text);
  const existing = await db.vocab.where("text").equals(text).first();
  const now = new Date();
  const row: VocabEntry = {
    ...existing,
    ...entry,
    id: existing?.id ?? uuidv4(),
    text,
    createdAt: existing?.createdAt ?? now,
    stateUpdatedAt: now,
  };
  await db.vocab.put(row);
  return row;
}

export async function updateVocabState(id: string, state: WordState) {
  await db.vocab.update(id, { state, stateUpdatedAt: new Date() });
}

/** Set a word's state by its text, creating a bare entry if needed. */
export async function updateWordState(
  word: string,
  state: WordState
): Promise<boolean> {
  try {
    const existing = await getVocabByText(word);
    if (existing) {
      await updateVocabState(existing.id, state);
    } else {
      await saveVocab({
        text: word,
        type: "word",
        sentence: "",
        translation: "",
        state,
        reviewCount: 0,
      });
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// ── Lessons ────────────────────────────────────────────────────────────────

const starterFiles = import.meta.glob("./content/starter/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

import starterManifest from "./content/starter/manifest.json";

/** Adds Lector's 20 graded Indonesian starter lessons on first run. */
export async function ensureStarterLessons() {
  const count = await db.lessons.where("source").equals("starter").count();
  if (count > 0) return;
  const lessons: Lesson[] = starterManifest.lessons.map((l, i) => {
    const raw = starterFiles[`./content/starter/${l.file}`] ?? "";
    return {
      id: `starter-${l.file.replace(/\.md$/, "")}`,
      title: l.title,
      author: starterManifest.author,
      content: raw.replace(/^# .*\n+/, ""),
      source: "starter",
      sortOrder: i,
      createdAt: new Date(),
    };
  });
  await db.lessons.bulkPut(lessons);
}

export function getLesson(id: string) {
  return db.lessons.get(id);
}

export async function saveLesson(input: {
  title: string;
  author?: string;
  content: string;
}): Promise<string> {
  const id = uuidv4();
  await db.lessons.add({
    id,
    title: input.title,
    author: input.author,
    content: input.content,
    source: "paste",
    createdAt: new Date(),
  });
  return id;
}

export function deleteLesson(id: string) {
  return db.lessons.delete(id);
}

export function touchLesson(id: string) {
  return db.lessons.update(id, { lastReadAt: new Date() });
}

// ── Cloze sentences ────────────────────────────────────────────────────────

interface BankRow {
  id: number;
  text: string;
  translation: string;
  clozeWord: string;
  clozeIndex: number;
  wordRank: number;
  collection: ClozeCollection;
}

/**
 * Lector seeds clozeSentences from sentence-bank-<lang>.json on the server
 * (POST /api/cloze/seed). Here the bank is a static file loaded once.
 */
export async function ensureClozeSeeded(): Promise<number> {
  const count = await db.cloze.count();
  if (count > 0) return count;
  const res = await fetch(`${import.meta.env.BASE_URL}data/sentences-id.json`);
  if (!res.ok) throw new Error(`Could not load sentences (${res.status})`);
  const bank: BankRow[] = await res.json();
  const now = new Date();
  const rows: ClozeSentence[] = bank.map((b) => ({
    id: `tatoeba-${b.id}`,
    sentence: b.text,
    clozeWord: b.clozeWord,
    clozeIndex: b.clozeIndex,
    translation: b.translation,
    source: "tatoeba",
    collection: b.collection,
    wordRank: b.wordRank,
    tatoebaSentenceId: b.id,
    masteryLevel: 0,
    nextReview: now,
    reviewCount: 0,
    timesCorrect: 0,
    timesIncorrect: 0,
  }));
  await db.cloze.bulkPut(rows);
  return rows.length;
}

export type ClozeMode = "new" | "review" | "due";

/** Port of Lector's GET /api/cloze/due: filter, then random order. */
export async function getDueCloze(
  mode: ClozeMode,
  collection: ClozeCollection | "all",
  limit: number
): Promise<ClozeSentence[]> {
  const now = new Date();
  const rows = await db.cloze
    .filter((c) => {
      if (c.blacklisted) return false;
      if (collection !== "all" && c.collection !== collection) return false;
      if (mode === "new") return c.reviewCount === 0;
      if (mode === "review") return c.reviewCount > 0 && c.nextReview <= now;
      return c.nextReview <= now;
    })
    .toArray();
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return rows.slice(0, limit);
}

export async function countCloze() {
  const now = new Date();
  const all = await db.cloze.toArray();
  return {
    total: all.length,
    fresh: all.filter((c) => c.reviewCount === 0 && !c.blacklisted).length,
    due: all.filter(
      (c) => c.reviewCount > 0 && c.nextReview <= now && !c.blacklisted
    ).length,
    mastered: all.filter((c) => c.masteryLevel === 100).length,
  };
}

/** Port of Lector's POST /api/cloze/:id/review. */
export async function updateClozeAfterReview(
  sentenceId: string,
  isCorrect: boolean,
  masteryLevel: ClozeMasteryLevel,
  nextReview: Date
): Promise<boolean> {
  try {
    const row = await db.cloze.get(sentenceId);
    if (!row) return false;
    await db.cloze.update(sentenceId, {
      masteryLevel,
      nextReview,
      reviewCount: row.reviewCount + 1,
      lastReviewed: new Date(),
      timesCorrect: row.timesCorrect + (isCorrect ? 1 : 0),
      timesIncorrect: row.timesIncorrect + (isCorrect ? 0 : 1),
    });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function blacklistCloze(sentenceId: string) {
  await db.cloze.update(sentenceId, { blacklisted: true });
}
