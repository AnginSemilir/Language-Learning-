// Known and familiar words from both places they come from: words marked
// while reading (the words table) and flashcards. A card marked known counts
// its words as known; a card marked familiar, or mature (reviewed with a gap
// of 21 days or more), counts them as familiar. A card with several words
// counts each, fixed phrases like "tanggung jawab" staying whole (see
// cardWords.ts). Flashcard words are worked out on the fly, so a card that's
// forgotten later drops back out.

import type { KnownLevel } from "@/logic/card/card";
import { db } from "@/logic/db";
import { cardWords } from "./cardWords";
import { loadGrammar } from "./dictionary";
import { getUserCardIndex } from "./flashcards";
import type { GrammarData, Lemmatizer } from "./lemma";
import { STATE_RANK } from "./types";

export interface KnownWord {
  /** Folded headword, or a fixed phrase. */
  text: string;
  /** Known (doesn't come back) or familiar (probably known; comes back). */
  level: KnownLevel;
  /** Other spellings seen while reading (dibeli for beli). */
  forms: string[];
  translation: string;
  viaReading: boolean;
  viaFlashcard: boolean;
  /** The words-table row, when the word was marked while reading. */
  entryId?: string;
}

/** The stronger of two levels. */
export function higher(a: KnownLevel | undefined, b: KnownLevel | undefined) {
  if (!a) return b;
  if (!b) return a;
  return STATE_RANK[a] >= STATE_RANK[b] ? a : b;
}

/** Whether the dictionary has this phrase as one entry. */
export function dictionaryHasPhrase(data: GrammarData | null) {
  return (key: string) =>
    !!data && (key in data.e || (!!data.x && key in data.x));
}

/**
 * The words each flashcard counts as known or familiar, keyed by headword
 * (fixed phrases as they are), with the card's translation for one-word
 * cards.
 */
export function cardWordLevels(
  cards: Map<string, { status?: KnownLevel; back: string }>,
  grammar: { data: GrammarData; lex: Lemmatizer } | null
) {
  const isPhrase = dictionaryHasPhrase(grammar?.data ?? null);
  const levels = new Map<string, { level: KnownLevel; translation: string }>();
  for (const [key, card] of cards) {
    if (!card.status) continue;
    const words = cardWords(key, isPhrase);
    for (const word of words) {
      const headword =
        word.includes(" ") || !grammar ? word : grammar.lex.lemma(word);
      const seen = levels.get(headword);
      levels.set(headword, {
        level: higher(seen?.level, card.status) ?? card.status,
        translation: seen?.translation || (words.length === 1 ? card.back : ""),
      });
    }
  }
  return levels;
}

export async function getKnownWords(): Promise<KnownWord[]> {
  const [words, cards, grammar] = await Promise.all([
    db.words.toArray(),
    getUserCardIndex(),
    loadGrammar().catch(() => null),
  ]);
  const byText = new Map<string, KnownWord>();
  const ignored = new Set<string>();
  for (const w of words) {
    if (w.state === "ignored") ignored.add(w.text);
    if (w.state !== "known" && w.state !== "familiar") continue;
    byText.set(w.text, {
      text: w.text,
      level: w.state,
      forms: (w.forms ?? []).filter((f) => f !== w.text),
      translation: w.translation,
      viaReading: true,
      viaFlashcard: false,
      entryId: w.id,
    });
  }
  for (const [text, { level, translation }] of cardWordLevels(cards, grammar)) {
    if (ignored.has(text)) continue;
    const existing = byText.get(text);
    if (existing) {
      existing.viaFlashcard = true;
      existing.level = higher(existing.level, level) ?? level;
      if (!existing.translation) existing.translation = translation;
    } else {
      byText.set(text, {
        text,
        level,
        forms: [],
        translation,
        viaReading: false,
        viaFlashcard: true,
      });
    }
  }
  return [...byText.values()].sort((a, b) =>
    a.text.localeCompare(b.text, "id")
  );
}
