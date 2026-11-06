// Known words from both places they come from: words marked known while
// reading (the words table) and words whose flashcard is mature (see
// flashcards.ts MATURE_DAYS). Flashcard words are derived on the fly, so a
// card that is forgotten later drops back out.

import { db } from "@/logic/db";
import { getUserCardIndex } from "./flashcards";

export interface KnownWord {
  /** Folded headword. */
  text: string;
  /** Other spellings seen while reading (dibeli for beli). */
  forms: string[];
  translation: string;
  viaReading: boolean;
  viaFlashcard: boolean;
  /** The words-table row, when the word was marked while reading. */
  entryId?: string;
}

export async function getKnownWords(): Promise<KnownWord[]> {
  const [words, cards] = await Promise.all([
    db.words.toArray(),
    getUserCardIndex(),
  ]);
  const byText = new Map<string, KnownWord>();
  const ignored = new Set<string>();
  for (const w of words) {
    if (w.state === "ignored") ignored.add(w.text);
    if (w.state !== "known") continue;
    byText.set(w.text, {
      text: w.text,
      forms: (w.forms ?? []).filter((f) => f !== w.text),
      translation: w.translation,
      viaReading: true,
      viaFlashcard: false,
      entryId: w.id,
    });
  }
  for (const [key, card] of cards) {
    // Single words only: a phrase card isn't one known word.
    if (!card.mature || key.includes(" ") || ignored.has(key)) continue;
    const existing = byText.get(key);
    if (existing) {
      existing.viaFlashcard = true;
      if (!existing.translation) existing.translation = card.back;
    } else {
      byText.set(key, {
        text: key,
        forms: [],
        translation: card.back,
        viaReading: false,
        viaFlashcard: true,
      });
    }
  }
  return [...byText.values()].sort((a, b) =>
    a.text.localeCompare(b.text, "id")
  );
}
