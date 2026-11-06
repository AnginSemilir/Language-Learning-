// Bridges Lector's reader vocabulary and Skola's flashcards: look up a word in
// the user's own cards, and save a word from the reader as a new card.

import { db } from "@/logic/db";
import { newDeck } from "@/logic/deck/newDeck";
import { MATURE_DAYS } from "@/logic/growth";
import {
  backHtml,
  duplicateKey,
  frontHtml,
} from "@/logic/import/importFlashcards";
import { sameText } from "@/logic/note/repeatedHint";
import createDoubleSidedNote from "@/logic/type-implementations/double-sided/createDoubleSidedNote";
import { State } from "fsrs.js";
import { vocabKey } from "./data-layer";

export const DEFAULT_DECK_NAME = "Indonesian";
const LAST_DECK_KEY = "kartu-reader-deck";

function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Text of the first paragraph: the word itself, without the example sentence. */
function firstParagraph(html: string) {
  return stripHtml(html.match(/<p>(.*?)<\/p>/s)?.[1] ?? html);
}

function noteFields(content: unknown) {
  const c = content as {
    field1?: string;
    field2?: string;
    front?: string;
    back?: string;
  };
  return { frontSide: c.field1 ?? c.front, backSide: c.field2 ?? c.back };
}

/**
 * A note as plain text: the word, its meaning, and the example sentence an
 * imported card keeps under the word (the CSV's hint column).
 */
export function noteText(
  content: unknown
): { front: string; back: string; example: string } | null {
  const { frontSide, backSide } = noteFields(content);
  if (!frontSide || !backSide) return null;
  const paragraphs = [...frontSide.matchAll(/<p>(.*?)<\/p>/gs)].map((m) =>
    stripHtml(m[1])
  );
  const front = paragraphs[0] ?? stripHtml(frontSide);
  const example = paragraphs[1] ?? "";
  return {
    front,
    back: stripHtml(backSide),
    // A hint that only repeats the card isn't an example sentence.
    example: sameText(example, front) ? "" : example,
  };
}

export interface CardMatch {
  noteId: string;
  deckId: string;
  front: string;
  back: string;
  /**
   * The Indonesian → English card is mature: in review with an interval of
   * 21 days or more (Anki's definition). Such a word counts as known.
   */
  mature: boolean;
}

/** Days between reviews from which a flashcard counts the word as known. */
export { MATURE_DAYS };

/** Notes whose Indonesian → English card is mature. */
async function matureNoteIds(): Promise<Set<string>> {
  const cards = await db.cards.toArray();
  const ids = new Set<string>();
  for (const card of cards) {
    const content = card.content as { frontIsField1?: boolean };
    if (content.frontIsField1 === false) continue; // English → Indonesian side
    if (
      card.model.state === State.Review &&
      card.model.scheduled_days >= MATURE_DAYS
    ) {
      ids.add(card.note);
    }
  }
  return ids;
}

/** The user's own cards keyed by the folded word on the Indonesian side. */
export async function getUserCardIndex(): Promise<Map<string, CardMatch>> {
  const [notes, mature] = await Promise.all([
    db.notes.toArray(),
    matureNoteIds(),
  ]);
  const index = new Map<string, CardMatch>();
  for (const n of notes) {
    const { frontSide, backSide } = noteFields(n.content);
    if (!frontSide || !backSide) continue;
    const key = vocabKey(duplicateKey(frontSide));
    if (!index.has(key)) {
      index.set(key, {
        noteId: n.id,
        deckId: n.deck,
        front: firstParagraph(frontSide),
        back: stripHtml(backSide),
        mature: mature.has(n.id),
      });
    }
  }
  return index;
}

export function getLastDeckId(): string | null {
  try {
    return localStorage.getItem(LAST_DECK_KEY);
  } catch {
    return null;
  }
}

/** The deck new reader cards go to: last used, else "Indonesian" (created if missing). */
export async function resolveTargetDeck(deckId?: string | null) {
  const wanted = deckId ?? getLastDeckId();
  if (wanted) {
    const deck = await db.decks.get(wanted);
    if (deck) return deck;
  }
  const decks = await db.decks.toArray();
  const named = decks.find(
    (d) => d.name.trim().toLowerCase() === DEFAULT_DECK_NAME.toLowerCase()
  );
  if (named) return named;
  const id = await newDeck(DEFAULT_DECK_NAME);
  const created = await db.decks.get(id);
  if (!created) throw new Error("Could not create deck");
  return created;
}

export async function addWordAsCard(input: {
  word: string;
  translation: string;
  sentence: string;
  deckId?: string | null;
}): Promise<{ noteId: string; deckName: string }> {
  const deck = await resolveTargetDeck(input.deckId);
  const row = {
    front: input.word,
    back: input.translation,
    hint: input.sentence,
  };
  const noteId = await createDoubleSidedNote(
    { field1: frontHtml(row), field2: backHtml(row) },
    deck
  );
  try {
    localStorage.setItem(LAST_DECK_KEY, deck.id);
  } catch {
    // Remembering the deck is a convenience only.
  }
  return { noteId, deckName: deck.name };
}
