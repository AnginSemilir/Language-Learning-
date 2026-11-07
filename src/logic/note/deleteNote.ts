import { db } from "../db";
import { invalidateDeckStatsCache } from "../deck/deckStatsCacheManager";
import { Note, NoteType } from "./note";

/**
 * This function deletes a note from the database.
 *
 * **Side effects:** It also deletes all cards that reference the note and updates the deck to remove the note and the cards that reference it.
 */

export async function deleteNote(note: Note<NoteType>) {
  await db.transaction("rw", db.notes, db.cards, db.decks, async () => {
    const keys = await db.cards.where("note").equals(note.id).primaryKeys();
    const cardIds = keys as string[];
    await db.cards.bulkDelete(cardIds);
    await db.notes.delete(note.id);
    const deck = await db.decks.get(note.deck);
    if (deck) {
      const deleted = new Set(cardIds);
      await db.decks.update(note.deck, {
        notes: deck.notes.filter((n) => n !== note.id),
        cards: deck.cards.filter((c) => !deleted.has(c)),
      });
    }
  });
  // The deck's new/review counts no longer include the deleted cards.
  await invalidateDeckStatsCache(note.deck);
}
