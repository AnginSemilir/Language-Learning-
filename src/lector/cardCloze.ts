// Gap-fill practice on the user's own flashcards. It reads the cards but
// never changes them: card reviews and known words are left as they are.
//
// Each card word has one schedule (Lector's mastery steps: back after 1, 3, 7,
// then 14 days; a miss starts again) and gets a different sentence each time.
// Sentences come from the sentence pool (sentencePool.ts), the example saved
// on the card, and the texts in the reading library, in that order. Among
// them, the one with the fewest words you don't know yet is picked, skipping
// sentences shown recently and ones you've hidden.

import { db } from "@/logic/db";
import { State } from "fsrs.js";
import { incrementDailyStat } from "./data-layer";
import { loadGrammar } from "./dictionary";
import { noteText } from "./flashcards";
import { getKnownWords } from "./knownWords";
import { id as pack } from "./languages/id/manifest";
import { splitSentences, tokenizeWords } from "./languages/tokenizer";
import { type Lemmatizer, fold } from "./lemma";
import {
  POOL_SOURCE_LABEL,
  type PoolSource,
  poolSentences,
  sentenceKey,
} from "./sentencePool";
import type {
  ClozeMasteryLevel,
  ClozeSentence,
  ClozeSource,
  ClozeWord,
} from "./types";

export type CardFilter = "studied" | "all";
export type CardClozeMode = "due" | "new" | "review";

/** How many recent sentences to avoid repeating, per word. */
const RECENT = 10;
/** Card fronts longer than this are sentences, not words to gap-fill. */
const MAX_PHRASE_WORDS = 4;
/** Sentences taken from the reading library, per word. */
const LIBRARY_PER_WORD = 10;

export interface CardWord {
  /** Headword (dibeli → beli) or folded phrase: the key for sentences and progress. */
  key: string;
  /** The word as written on the card. */
  term: string;
  /** The card's back. */
  meaning: string;
  /** The example sentence saved on the card, if any. */
  example: string;
  /** At least one Indonesian → English card has been reviewed. */
  studied: boolean;
}

interface Candidate {
  id: string;
  text: string;
  translation: string;
  source: ClozeSource;
  sourceName: string;
  /** Picked after the others: OpenSubtitles, whose translations are loose. */
  lowPriority?: boolean;
}

function poolSource(source: PoolSource): ClozeSource {
  if (source === "t") return "tatoeba";
  if (source === "w") return "wiktionary";
  if (source === "n" || source === "p") return "leipzig";
  return "corpus";
}

/**
 * The word to practise from a card front: notes in brackets dropped, the first
 * of several alternatives ("kamu / anda" → "kamu"), end punctuation removed.
 */
export function cardTerm(front: string): string {
  return front
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .split(/[/;,]/)[0]
    .replace(/[.!?¿¡"“”]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The key a card's sentences and progress are stored under, or null for a sentence card. */
export function termKey(term: string, lex: Lemmatizer): string | null {
  const words = tokenizeWords(term, pack).map((t) => fold(t.text));
  if (words.length === 0 || words.length > MAX_PHRASE_WORDS) return null;
  return words.length === 1 ? lex.lemma(words[0]) : words.join(" ");
}

/** The user's card words, one per key. */
export async function getCardWords(
  lex: Lemmatizer
): Promise<Map<string, CardWord>> {
  const [notes, cards] = await Promise.all([
    db.notes.toArray(),
    db.cards.toArray(),
  ]);
  const studied = new Set<string>();
  for (const card of cards) {
    const content = card.content as { frontIsField1?: boolean };
    if (content.frontIsField1 === false) continue;
    if (card.model.state !== State.New) studied.add(card.note);
  }
  const words = new Map<string, CardWord>();
  for (const note of notes) {
    const text = noteText(note.content);
    if (!text) continue;
    const term = cardTerm(text.front);
    const key = termKey(term, lex);
    if (!key) continue;
    const existing = words.get(key);
    if (existing) {
      existing.studied ||= studied.has(note.id);
      continue;
    }
    words.set(key, {
      key,
      term,
      meaning: text.back,
      example: text.example,
      studied: studied.has(note.id),
    });
  }
  return words;
}

interface Span {
  start: number;
  end: number;
  /** Lemmas of the other words, for judging how hard the sentence is. */
  others: string[];
}

/** Where the word (any form sharing its headword) or phrase is in a sentence. */
export function findSpan(
  text: string,
  key: string,
  lex: Lemmatizer
): Span | null {
  const tokens = tokenizeWords(text, pack);
  const folded = tokens.map((t) => fold(t.text));
  const parts = key.split(" ");
  let at = -1;
  for (let i = 0; i + parts.length <= folded.length && at < 0; i++) {
    const match =
      parts.length === 1
        ? folded[i] === key || lex.lemma(folded[i]) === key
        : parts.every((p, j) => folded[i + j] === p);
    if (match) at = i;
  }
  if (at < 0) return null;
  const last = at + parts.length - 1;
  const others: string[] = [];
  tokens.forEach((t, i) => {
    if (i >= at && i <= last) return;
    // Names and numbers aren't words to know.
    if ((i > 0 && /^\p{Lu}/u.test(t.text)) || /\d/.test(t.text)) return;
    others.push(lex.lemma(folded[i]));
  });
  return { start: tokens[at].start, end: tokens[last].end, others };
}

/** Sentences from the reading library for the given keys, built once per round. */
async function librarySentences(
  keys: Set<string>,
  lex: Lemmatizer
): Promise<Map<string, Candidate[]>> {
  const found = new Map<string, Candidate[]>();
  const phrases = [...keys].filter((k) => k.includes(" "));
  for (const lesson of await db.lessons.toArray()) {
    for (const raw of splitSentences(lesson.content, pack)) {
      const text = raw.replace(/\s+/g, " ").trim();
      if (text.length < 12 || text.length > 200) continue;
      const folded = tokenizeWords(text, pack).map((t) => fold(t.text));
      const joined = ` ${folded.join(" ")} `;
      const hits = new Set<string>();
      for (const f of folded) {
        const l = lex.lemma(f);
        if (keys.has(l)) hits.add(l);
      }
      for (const p of phrases) if (joined.includes(` ${p} `)) hits.add(p);
      for (const key of hits) {
        const list = found.get(key) ?? [];
        if (list.length >= LIBRARY_PER_WORD) continue;
        list.push({
          id: sentenceKey(text),
          text,
          translation: "",
          source: "reading",
          sourceName: lesson.title
            ? `your reading: ${lesson.title}`
            : "your reading",
        });
        found.set(key, list);
      }
    }
  }
  return found;
}

async function poolCandidates(
  word: CardWord
): Promise<{ candidates: Candidate[]; failed: boolean }> {
  const candidates: Candidate[] = [];
  let failed = false;
  try {
    for (const [text, translation, source] of await poolSentences(word.key)) {
      candidates.push({
        id: sentenceKey(text),
        text,
        translation,
        source: poolSource(source),
        sourceName: POOL_SOURCE_LABEL[source] ?? "",
        lowPriority: source === "o",
      });
    }
  } catch {
    failed = true; // Offline and not downloaded yet.
  }
  if (word.example) {
    candidates.push({
      id: sentenceKey(word.example),
      text: word.example,
      translation: "",
      source: "card",
      sourceName: "your card",
    });
  }
  return { candidates, failed };
}

function toCloze(
  word: CardWord,
  candidate: Candidate,
  span: Span,
  row: ClozeWord | undefined
): ClozeSentence {
  const { text } = candidate;
  const gap = text.slice(span.start, span.end);
  return {
    id: candidate.id,
    sentence: text,
    clozeWord: gap,
    clozeIndex: 1,
    // Three pieces that join back into the sentence, so the gap can be any
    // span (a phrase, a hyphenated word) rather than one whitespace token.
    tokens: [text.slice(0, span.start), gap, text.slice(span.end)],
    translation: candidate.translation,
    source: candidate.source,
    sourceName: candidate.sourceName,
    collection: "cards",
    vocabEntryId: word.key,
    cardWord: word.term,
    clue: word.meaning,
    masteryLevel: row?.masteryLevel ?? 0,
    nextReview: row?.nextReview ?? new Date(),
    reviewCount: row?.reviewCount ?? 0,
    lastReviewed: row?.lastReviewed,
    timesCorrect: row?.timesCorrect ?? 0,
    timesIncorrect: row?.timesIncorrect ?? 0,
  };
}

/**
 * The sentence to show: not hidden, not shown recently (the oldest-seen one
 * if all have been), the card's own example first, then the one with the
 * fewest words you don't know, translated if possible.
 */
export function pickSentence(
  word: CardWord,
  candidates: Candidate[],
  row: ClozeWord | undefined,
  known: Set<string>,
  lex: Lemmatizer
): ClozeSentence | null {
  const hidden = new Set(row?.hidden ?? []);
  const recent = row?.recent ?? [];
  let best: { score: number; candidate: Candidate; span: Span } | null = null;
  for (const [index, candidate] of candidates.entries()) {
    if (hidden.has(candidate.id)) continue;
    const span = findSpan(candidate.text, word.key, lex);
    if (!span) continue;
    const seen = recent.indexOf(candidate.id);
    const unknown = span.others.filter((l) => !known.has(l)).length;
    // Your own card's example comes first; you know what it means.
    const own = candidate.source === "card";
    const score =
      (seen >= 0 ? 1000 + seen * 10 : 0) +
      (own ? -100 : unknown * 2 + (candidate.translation ? 0 : 3)) +
      (candidate.lowPriority ? 6 : 0) +
      index * 0.25;
    if (!best || score < best.score) best = { score, candidate, span };
  }
  return best ? toCloze(word, best.candidate, best.span, row) : null;
}

async function knownLemmas(lex: Lemmatizer): Promise<Set<string>> {
  const known = new Set<string>();
  for (const w of await getKnownWords()) {
    known.add(w.text);
    for (const f of w.forms) known.add(lex.lemma(f));
  }
  return known;
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export interface CardRound {
  sentences: ClozeSentence[];
  /** Words left out because no sentence contains them. */
  skipped: string[];
  /** Some sentence files couldn't be downloaded (offline). */
  offline: boolean;
}

/**
 * A round: words due for review (mode "due" also tops up with new words),
 * each with one sentence. New words come from cards you've studied, unless
 * the filter is "all".
 */
export async function buildCardRound(
  mode: CardClozeMode,
  filter: CardFilter,
  size: number
): Promise<CardRound> {
  const { lex } = await loadGrammar();
  const [words, rows, known] = await Promise.all([
    getCardWords(lex),
    db.clozeWords.toArray().then((r) => new Map(r.map((x) => [x.id, x]))),
    knownLemmas(lex),
  ]);
  const now = new Date();
  const due: CardWord[] = [];
  const fresh: CardWord[] = [];
  for (const word of words.values()) {
    const row = rows.get(word.key);
    if (row && row.reviewCount > 0) {
      if (row.nextReview <= now) due.push(word);
    } else if (filter === "all" || word.studied) {
      fresh.push(word);
    }
  }
  const order =
    mode === "new"
      ? shuffle(fresh)
      : mode === "review"
        ? shuffle(due)
        : [...shuffle(due), ...shuffle(fresh)];

  const round: CardRound = { sentences: [], skipped: [], offline: false };
  let library: Map<string, Candidate[]> | null = null;
  for (let i = 0; i < order.length && round.sentences.length < size; ) {
    const batch = order.slice(i, i + size - round.sentences.length + 2);
    i += batch.length;
    const found = await Promise.all(batch.map(poolCandidates));
    for (const [j, word] of batch.entries()) {
      if (round.sentences.length >= size) break;
      const { candidates, failed } = found[j];
      round.offline ||= failed;
      const row = rows.get(word.key);
      let sentence = pickSentence(word, candidates, row, known, lex);
      if (!sentence) {
        library ??= await librarySentences(new Set(words.keys()), lex);
        sentence = pickSentence(
          word,
          library.get(word.key) ?? [],
          row,
          known,
          lex
        );
      }
      if (sentence) round.sentences.push(sentence);
      else round.skipped.push(word.term);
    }
  }
  return round;
}

export interface CardClozeCounts {
  words: number;
  due: number;
  fresh: number;
  mastered: number;
}

export async function countCardCloze(
  filter: CardFilter
): Promise<CardClozeCounts> {
  const { lex } = await loadGrammar();
  const [words, rows] = await Promise.all([
    getCardWords(lex),
    db.clozeWords.toArray(),
  ]);
  const now = new Date();
  const practised = new Map(
    rows
      .filter((r) => words.has(r.id) && r.reviewCount > 0)
      .map((r) => [r.id, r])
  );
  let fresh = 0;
  for (const w of words.values()) {
    if (!practised.has(w.key) && (filter === "all" || w.studied)) fresh++;
  }
  const list = [...practised.values()];
  return {
    words: words.size,
    due: list.filter((r) => r.nextReview <= now).length,
    fresh,
    mastered: list.filter((r) => r.masteryLevel === 100).length,
  };
}

function emptyRow(id: string): ClozeWord {
  return {
    id,
    masteryLevel: 0,
    nextReview: new Date(),
    reviewCount: 0,
    timesCorrect: 0,
    timesIncorrect: 0,
    recent: [],
    hidden: [],
  };
}

/** Saves one answer to the word's schedule and remembers the sentence as seen. */
export async function saveCardReview(
  sentence: ClozeSentence,
  isCorrect: boolean,
  masteryLevel: ClozeMasteryLevel,
  nextReview: Date
): Promise<boolean> {
  const key = sentence.vocabEntryId;
  if (!key) return false;
  try {
    await db.transaction("rw", db.clozeWords, async () => {
      const row = (await db.clozeWords.get(key)) ?? emptyRow(key);
      await db.clozeWords.put({
        ...row,
        masteryLevel,
        nextReview,
        reviewCount: row.reviewCount + 1,
        lastReviewed: new Date(),
        timesCorrect: row.timesCorrect + (isCorrect ? 1 : 0),
        timesIncorrect: row.timesIncorrect + (isCorrect ? 0 : 1),
        recent: [
          ...row.recent.filter((id) => id !== sentence.id),
          sentence.id,
        ].slice(-RECENT),
      });
    });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

/** Never show this sentence for this word again. */
export async function hideCardSentence(sentence: ClozeSentence) {
  const key = sentence.vocabEntryId;
  if (!key) return;
  await db.transaction("rw", db.clozeWords, async () => {
    const row = (await db.clozeWords.get(key)) ?? emptyRow(key);
    if (!row.hidden.includes(sentence.id)) {
      await db.clozeWords.put({ ...row, hidden: [...row.hidden, sentence.id] });
    }
  });
}

/**
 * Activity stats only. Gap-fill doesn't change your flashcards or which
 * words count as known; its progress stays in clozeWords.
 */
export async function recordCardPractice(points: number): Promise<boolean> {
  let ok = await incrementDailyStat("clozePracticed");
  if (points > 0) ok = (await incrementDailyStat("points", points)) && ok;
  return ok;
}
