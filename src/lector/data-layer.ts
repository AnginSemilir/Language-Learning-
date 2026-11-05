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

// ── Headwords (grammar-aware states) ───────────────────────────────────────
//
// The reader stores a word's state under its headword (lemma), so membeli,
// dibeli and beli share one entry. `forms` records the spellings seen.
// Entries saved earlier under a surface form are merged in when touched.

export interface HeadwordPatch {
  state: WordState;
  form?: string;
  sentence?: string;
  translation?: string;
  lessonId?: string;
  noteId?: string;
}

export async function setHeadwordState(
  headword: string,
  patch: HeadwordPatch
): Promise<VocabEntry> {
  return db.transaction("rw", db.vocab, async () => {
    const key = vocabKey(headword);
    const existing = await db.vocab.where("text").equals(key).first();
    const formKey = patch.form ? vocabKey(patch.form) : undefined;
    const legacy =
      formKey && formKey !== key
        ? await db.vocab.where("text").equals(formKey).first()
        : undefined;
    const now = new Date();
    const forms = new Set([
      ...(existing?.forms ?? []),
      ...(legacy?.forms ?? []),
      ...(formKey && formKey !== key ? [formKey] : []),
    ]);
    const row: VocabEntry = {
      type: "word",
      sentence: "",
      translation: "",
      reviewCount: 0,
      ...legacy,
      ...existing,
      id: existing?.id ?? legacy?.id ?? uuidv4(),
      text: key,
      state: patch.state,
      stateUpdatedAt: now,
      createdAt: existing?.createdAt ?? legacy?.createdAt ?? now,
      forms: [...forms],
      ...(patch.sentence ? { sentence: patch.sentence } : {}),
      ...(patch.translation ? { translation: patch.translation } : {}),
      ...(patch.lessonId ? { lessonId: patch.lessonId } : {}),
      ...(patch.noteId ? { noteId: patch.noteId } : {}),
    };
    if (legacy && legacy.id !== row.id) await db.vocab.delete(legacy.id);
    await db.vocab.put(row);
    return row;
  });
}

/** Marks many headwords known at once (the reader's "mark the rest as known"). */
export async function markHeadwordsKnown(
  items: { headword: string; forms: string[] }[],
  lessonId?: string
) {
  if (items.length === 0) return;
  const now = new Date();
  await db.transaction("rw", db.vocab, async () => {
    for (const item of items) {
      const key = vocabKey(item.headword);
      const existing = await db.vocab.where("text").equals(key).first();
      const forms = new Set([
        ...(existing?.forms ?? []),
        ...item.forms.map(vocabKey).filter((f) => f !== key),
      ]);
      await db.vocab.put({
        type: "word",
        sentence: "",
        translation: "",
        reviewCount: 0,
        ...existing,
        id: existing?.id ?? uuidv4(),
        text: key,
        state: "known",
        stateUpdatedAt: now,
        createdAt: existing?.createdAt ?? now,
        forms: [...forms],
        ...(lessonId && !existing ? { lessonId } : {}),
      });
    }
  });
  await incrementDailyStat("wordsMarkedKnown", items.length);
}

export function deleteVocab(id: string) {
  return db.vocab.delete(id);
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

/** Saves several lessons at once, e.g. the chapters of a book, in order. */
export async function saveLessons(
  items: {
    title: string;
    author?: string;
    collection?: string;
    content: string;
  }[]
): Promise<string[]> {
  const now = Date.now();
  const lessons: Lesson[] = items.map((item, i) => ({
    id: uuidv4(),
    title: item.title,
    author: item.author,
    collection: item.collection,
    content: item.content,
    source: "paste",
    sortOrder: i,
    createdAt: new Date(now + i),
  }));
  await db.lessons.bulkAdd(lessons);
  return lessons.map((l) => l.id);
}

export function deleteLesson(id: string) {
  return db.lessons.delete(id);
}

export function touchLesson(id: string) {
  return db.lessons.update(id, { lastReadAt: new Date() });
}

export function saveLessonPage(id: string, page: number, pageCount: number) {
  return db.lessons.update(id, {
    lastPage: page,
    pageCount,
    ...(page >= pageCount - 1 ? { finishedAt: new Date() } : {}),
  });
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
