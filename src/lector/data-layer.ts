// Client-side replacement for Lector's src/lib/data-layer.ts (heuwels/lector,
// AGPL-3.0-only). Lector's functions call its Hono API; these keep the same
// names and shapes but read and write the browser's IndexedDB through Dexie.

import { db, getDeviceId } from "@/logic/db";
import { v4 as uuidv4 } from "uuid";
import { id as pack } from "./languages/id/manifest";
import { emptyDailyStats } from "./lib/dailyStats";
import { dateStringInTimeZone } from "./lib/dates";
import { foldWord } from "./lib/languages";
import type { DailyStats, Lesson, VocabEntry, WordState } from "./types";

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

const emptyDay = emptyDailyStats;

/**
 * Adds to today's count for this device. Each device keeps its own row per
 * day (`date|device`) so syncing never overwrites another device's counts.
 */
export async function incrementDailyStat(
  field: CountField,
  by = 1
): Promise<boolean> {
  try {
    const date = todayKey();
    const device = getDeviceId();
    const id = `${date}|${device}`;
    await db.transaction("rw", db.activity, async () => {
      const row = (await db.activity.get(id)) ?? {
        ...emptyDay(date),
        id,
        device,
      };
      // A row saved before a field existed doesn't have it (undefined + 1 is
      // NaN, which would stick).
      row[field] = (row[field] || 0) + by;
      await db.activity.put(row);
    });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

/** One row per day, all devices added together. */
export async function getAllDailyStats(): Promise<DailyStats[]> {
  return sumByDate(await db.activity.toArray());
}

export function sumByDate(rows: DailyStats[]): DailyStats[] {
  const byDate = new Map<string, DailyStats>();
  for (const row of rows) {
    const day = byDate.get(row.date) ?? emptyDay(row.date);
    for (const field of Object.keys(day) as (keyof DailyStats)[]) {
      if (field !== "date") day[field] += row[field] ?? 0;
    }
    byDate.set(row.date, day);
  }
  return [...byDate.values()];
}

// ── Vocabulary ─────────────────────────────────────────────────────────────

export function vocabKey(word: string) {
  return foldWord(word, pack);
}

export async function getKnownWordsMap(): Promise<Map<string, WordState>> {
  const rows = await db.words.toArray();
  return new Map(rows.map((r) => [r.text, r.state]));
}

export function getVocabByText(text: string) {
  return db.words.get(vocabKey(text));
}

export async function saveVocab(
  entry: Omit<VocabEntry, "id" | "createdAt" | "stateUpdatedAt" | "text"> & {
    text: string;
  }
): Promise<VocabEntry> {
  const text = vocabKey(entry.text);
  const existing = await db.words.get(text);
  const now = new Date();
  const row: VocabEntry = {
    ...existing,
    ...entry,
    id: text,
    text,
    createdAt: existing?.createdAt ?? now,
    stateUpdatedAt: now,
  };
  await db.words.put(row);
  return row;
}

export async function updateVocabState(id: string, state: WordState) {
  await db.words.update(id, { state, stateUpdatedAt: new Date() });
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
  return db.transaction("rw", db.words, async () => {
    const key = vocabKey(headword);
    const existing = await db.words.get(key);
    const formKey = patch.form ? vocabKey(patch.form) : undefined;
    const legacy =
      formKey && formKey !== key ? await db.words.get(formKey) : undefined;
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
      id: key,
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
    if (legacy && legacy.id !== row.id) await db.words.delete(legacy.id);
    await db.words.put(row);
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
  await db.transaction("rw", db.words, async () => {
    for (const item of items) {
      const key = vocabKey(item.headword);
      const existing = await db.words.get(key);
      const forms = new Set([
        ...(existing?.forms ?? []),
        ...item.forms.map(vocabKey).filter((f) => f !== key),
      ]);
      await db.words.put({
        type: "word",
        sentence: "",
        translation: "",
        reviewCount: 0,
        ...existing,
        id: key,
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

/**
 * Group a word form with its root or count it separately; null goes back to
 * the automatic choice. Separating also drops the form from the root's list
 * of spellings seen.
 */
export async function setWordLink(
  form: string,
  mode: "separate" | "group" | null,
  root?: string
) {
  const key = vocabKey(form);
  await db.transaction("rw", db.wordLinks, db.words, async () => {
    if (mode === null) await db.wordLinks.delete(key);
    else await db.wordLinks.put({ form: key, mode });
    if (mode === "separate" && root) {
      const entry = await db.words.get(vocabKey(root));
      if (entry?.forms?.includes(key)) {
        await db.words.update(entry.id, {
          forms: entry.forms.filter((f) => f !== key),
        });
      }
    }
  });
}

export function deleteVocab(id: string) {
  return db.words.delete(id);
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
