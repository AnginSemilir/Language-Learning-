// The words the games play with: the ones you're learning now in your
// flashcards (learning, or reviewed but not yet mature), the most recently
// studied first. With only a few of those, new and then known words make up
// the numbers. The games only read the cards; reviews are left as they are.

import type { GrowthStage } from "../growth";

export interface GameWord {
  /** The note the word comes from. */
  id: string;
  /** Indonesian, as on the card (the first of several alternatives). */
  term: string;
  /** A short English meaning, to fit on a tile. */
  meaning: string;
  /** The card's whole back. */
  fullMeaning: string;
  stage: GrowthStage;
  /** Last answer on any of the note's cards (ms), 0 if never studied. */
  lastReviewed: number;
  /** When the card was added (ms). */
  added: number;
}

/** A game needs at least this many different words. */
export const MIN_GAME_WORDS = 4;

/** Enough for a lively round; more are used when there are more. */
export const TARGET_GAME_WORDS = 12;

/** Longest card front that still fits a game tile. */
const MAX_TERM_LENGTH = 24;
const MAX_TERM_WORDS = 3;

/**
 * A short meaning for a tile: notes in brackets dropped, then the first of
 * several meanings ("to eat; to consume" → "to eat"), at most `max` letters.
 */
export function shortGloss(meaning: string, max = 30): string {
  const clean = meaning
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  let gloss = clean.split(/\s*[;/|]\s*|\n/)[0].trim();
  if (gloss.length > max && gloss.includes(",")) {
    gloss = gloss.split(",")[0].trim();
  }
  gloss = gloss.replace(/[.,:;!?]+$/, "").trim();
  if (gloss.length > max) gloss = `${gloss.slice(0, max - 1).trimEnd()}…`;
  return gloss || clean.slice(0, max);
}

/** For telling words apart: case, accents and spacing ignored. */
export function sameKey(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function fitsGame(word: Pick<GameWord, "term" | "meaning">): boolean {
  const words = word.term.split(/\s+/).filter(Boolean).length;
  return (
    word.term.length > 0 &&
    word.term.length <= MAX_TERM_LENGTH &&
    words <= MAX_TERM_WORDS &&
    word.meaning.length > 0
  );
}

/** Learning (a sapling) or reviewed but under 21 days (a young oak). */
export function isLearningNow(word: GameWord): boolean {
  return word.stage === 1 || word.stage === 2;
}

export type GameWordChoice = "learning" | "all";

/**
 * The words for a game, without two that look the same or mean the same
 * (a round couldn't tell them apart). "learning" takes the words you're
 * learning now, topped up with new and then known words when there are
 * fewer than TARGET_GAME_WORDS; "all" takes every word, the ones you're
 * learning first.
 */
export function pickGameWords(
  candidates: GameWord[],
  choice: GameWordChoice = "learning"
): { words: GameWord[]; learningNow: number } {
  const usable = candidates.filter(fitsGame);
  const byRecent = (a: GameWord, b: GameWord) =>
    b.lastReviewed - a.lastReviewed || b.added - a.added;
  const learning = usable.filter(isLearningNow).sort(byRecent);
  const fresh = usable.filter((w) => w.stage === 0).sort(byRecent);
  const known = usable.filter((w) => w.stage >= 3).sort(byRecent);

  const ordered =
    choice === "all" || learning.length < TARGET_GAME_WORDS
      ? [...learning, ...fresh, ...known]
      : learning;

  const terms = new Set<string>();
  const meanings = new Set<string>();
  const words: GameWord[] = [];
  for (const word of ordered) {
    const term = sameKey(word.term);
    const meaning = sameKey(word.meaning);
    if (terms.has(term) || meanings.has(meaning)) continue;
    terms.add(term);
    meanings.add(meaning);
    words.push(word);
    if (choice === "learning" && words.length >= TARGET_GAME_WORDS) {
      // Enough to play with, but keep every word being learned now.
      if (words.length >= learning.length) break;
    }
  }
  const learningNow = words.filter(isLearningNow).length;
  return { words, learningNow };
}

/** Fisher–Yates, on a copy. */
export function shuffled<T>(items: T[], random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
