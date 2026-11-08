import { getAdapterOfType } from "../NoteTypeAdapter";
import { db } from "../db";
import { Deck } from "../deck/deck";
import { NoteContent } from "./NoteContent";
import { createNoteSkeleton } from "./createNoteSkeleton";
import { NoteType } from "./note";

/**
 * This function creates a new note in the database.
 *
 * **Side effects:** It also updates the deck to include the new note.
 */

export async function newNote<T extends NoteType>(
  deck: Deck,
  content: NoteContent<T>
) {
  const note = {
    ...createNoteSkeleton(deck.id),
    content,
    sortField: getAdapterOfType(content.type).getSortFieldFromNoteContent(
      content
    ),
  };
  // The deck's list is read inside the transaction rather than taken from
  // `deck`, which can be a read-only object from the database cache.
  await db.transaction("rw", db.decks, db.notes, async () => {
    await db.notes.add(note, note.id);
    const fresh = await db.decks.get(deck.id);
    await db.decks.update(deck.id, {
      notes: [...(fresh?.notes ?? []), note.id],
    });
  });
  return note.id;
}
