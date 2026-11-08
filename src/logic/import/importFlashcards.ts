import { HTMLtoPreviewString } from "@/logic/card/card";
import { createCardSkeleton } from "@/logic/card/createCardSkeleton";
import { db } from "@/logic/db";
import { Deck } from "@/logic/deck/deck";
import { invalidateDeckStatsCache } from "@/logic/deck/deckStatsCacheManager";
import { createNoteSkeleton } from "@/logic/note/createNoteSkeleton";
import { NoteType } from "@/logic/note/note";
import { sameText } from "@/logic/note/repeatedHint";
import { FlashcardRow } from "./parseCsv";

export type ImportDirection = "both" | "frontToBack";

export interface ImportResult {
  added: number;
  skipped: number;
  /** The notes added, to mark familiar or known after the import. */
  noteIds: string[];
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The target-language side: the word, plus the example sentence (hint) in
 * italics, unless the hint only repeats the word or sentence.
 */
export function frontHtml(row: FlashcardRow) {
  const word = `<p>${escapeHtml(row.front)}</p>`;
  return row.hint && !sameText(row.hint, row.front)
    ? `${word}<p><em>${escapeHtml(row.hint)}</em></p>`
    : word;
}

export function backHtml(row: FlashcardRow) {
  return `<p>${escapeHtml(row.back)}</p>`;
}

/**
 * Key used to skip rows that are already in the deck: the text of the first
 * paragraph (the word, without the example sentence), lower-cased.
 */
export function duplicateKey(html: string) {
  const first = html.match(/<p>(.*?)<\/p>/s)?.[1] ?? html;
  return first
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim()
    .toLowerCase();
}

/**
 * Adds every row to `deck` in one transaction. "both" makes a double-sided
 * note (two cards: front→back and back→front); "frontToBack" makes one basic
 * card. Rows whose front already exists in the deck are skipped.
 */
export async function importFlashcards(
  rows: FlashcardRow[],
  deck: Deck,
  direction: ImportDirection
): Promise<ImportResult> {
  return db.transaction("rw", db.decks, db.notes, db.cards, async () => {
    const fresh = await db.decks.get(deck.id);
    if (!fresh) throw new Error("Deck not found");

    const existing = await db.notes.where("deck").equals(deck.id).toArray();
    const seen = new Set(
      existing.map((n) => {
        const c = n.content as { field1?: string; front?: string };
        return duplicateKey(c.field1 ?? c.front ?? n.sortField);
      })
    );

    const notes = [];
    const cards = [];
    let skipped = 0;

    for (const row of rows) {
      const key = duplicateKey(`<p>${escapeHtml(row.front)}</p>`);
      if (seen.has(key)) {
        skipped++;
        continue;
      }
      seen.add(key);

      const front = frontHtml(row);
      const back = backHtml(row);
      const skeleton = createNoteSkeleton(deck.id);
      const noteId = skeleton.id;

      if (direction === "both") {
        notes.push({
          ...skeleton,
          content: { type: NoteType.DoubleSided, field1: front, field2: back },
          sortField: row.front.slice(0, 100),
        });
        for (const frontIsField1 of [true, false]) {
          cards.push({
            ...createCardSkeleton(),
            deck: deck.id,
            note: noteId,
            preview: HTMLtoPreviewString(frontIsField1 ? front : back),
            content: { type: NoteType.DoubleSided, frontIsField1 },
          });
        }
      } else {
        notes.push({
          ...skeleton,
          content: { type: NoteType.Basic, front, back },
          sortField: row.front.slice(0, 100),
        });
        cards.push({
          ...createCardSkeleton(),
          deck: deck.id,
          note: noteId,
          content: { type: NoteType.Basic },
        });
      }
    }

    // biome-ignore lint/suspicious/noExplicitAny: note/card unions are keyed by NoteType
    await db.notes.bulkAdd(notes as any);
    // biome-ignore lint/suspicious/noExplicitAny: see above
    await db.cards.bulkAdd(cards as any);
    fresh.notes.push(...notes.map((n) => n.id));
    fresh.cards.push(...cards.map((c) => c.id));
    // The deck passed in can be a read-only object from the database cache
    // (the Flashcards page's), so it isn't updated: readers see the change
    // through their live queries.
    await db.decks.update(deck.id, { notes: fresh.notes, cards: fresh.cards });
    await invalidateDeckStatsCache(deck.id);
    return { added: notes.length, skipped, noteIds: notes.map((n) => n.id) };
  });
}
