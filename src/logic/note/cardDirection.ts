// Which way a word note is asked: front → back, back → front, or both. A
// double-sided note has one card per direction; a basic note has one card,
// front → back, and becomes double-sided when another direction is chosen.
// A direction that stays keeps its card and its progress; one that's taken
// away is deleted with its review history.

import type { Card } from "../card/card";
import { createCardSkeleton } from "../card/createCardSkeleton";
import { deleteCard } from "../card/deleteCard";
import { newCard } from "../card/newCard";
import { db } from "../db";
import { type Note, NoteType } from "./note";
import { updateNoteContent } from "./updateNoteContent";

export type Direction = "forward" | "backward" | "both";

type WordNote = Note<NoteType.Basic> | Note<NoteType.DoubleSided>;

export function hasDirections(note: Note<NoteType>): note is WordNote {
  return (
    note.content.type === NoteType.Basic ||
    note.content.type === NoteType.DoubleSided
  );
}

/** Whether a card asks front → back (true) or back → front (false). */
export function asksForward(card: Card<NoteType>) {
  const content = card.content as { frontIsField1?: boolean };
  return content.frontIsField1 !== false;
}

export function directionOf(cards: Card<NoteType>[]): Direction {
  const forward = cards.some(asksForward);
  const backward = cards.some((c) => !asksForward(c));
  if (forward && backward) return "both";
  return backward ? "backward" : "forward";
}

/** The note's cards that a new direction would delete. */
export function cardsRemovedBy(
  cards: Card<NoteType>[],
  direction: Direction
): Card<NoteType>[] {
  if (direction === "both") return [];
  return cards.filter((c) =>
    direction === "forward" ? !asksForward(c) : asksForward(c)
  );
}

function sides(note: WordNote) {
  return note.content.type === NoteType.DoubleSided
    ? { front: note.content.field1, back: note.content.field2 }
    : { front: note.content.front, back: note.content.back };
}

/** Asks the note in the chosen direction(s), adding and removing cards. */
export async function setDirection(noteId: string, direction: Direction) {
  const note = (await db.notes.get(noteId)) as Note<NoteType> | undefined;
  if (!note || !hasDirections(note)) {
    throw new Error("Only word cards can be asked both ways.");
  }
  const deck = await db.decks.get(note.deck);
  if (!deck) throw new Error("The card's deck couldn't be found.");
  let cards = await db.cards.where("note").equals(noteId).toArray();
  if (directionOf(cards) === direction) return;

  const { front, back } = sides(note);
  // A basic note becomes double-sided; its card asks front → back.
  if (note.content.type === NoteType.Basic) {
    await updateNoteContent(noteId, {
      type: NoteType.DoubleSided,
      field1: front,
      field2: back,
    });
    for (const card of cards) {
      await db.cards.update(card.id, {
        content: { type: NoteType.DoubleSided, frontIsField1: true },
      });
    }
    cards = await db.cards.where("note").equals(noteId).toArray();
  }

  for (const [forward, wanted] of [
    [true, direction !== "backward"],
    [false, direction !== "forward"],
  ] as const) {
    const existing = cards.filter((c) => asksForward(c) === forward);
    if (wanted && existing.length === 0) {
      // newCard pushes onto the deck's card list, so give it a fresh copy.
      const fresh = await db.decks.get(deck.id);
      if (!fresh) continue;
      await newCard(
        {
          ...createCardSkeleton(),
          note: noteId,
          content: { type: NoteType.DoubleSided, frontIsField1: forward },
        },
        fresh
      );
    }
    if (!wanted) {
      for (const card of existing) await deleteCard(card);
    }
  }
}
