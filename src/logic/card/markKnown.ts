// Marking many cards familiar or known at once (a deck, cards picked in
// Manage Cards, or a word's cards from the reader). A familiar card gets its
// own random time in the range, so a batch comes back a few a day. No review
// is logged, so today's limits and statistics are left as they are.
import { type FSRS, Rating, State } from "fsrs.js";
import { db } from "../db";
import { invalidateDeckStatsCache } from "../deck/deckStatsCacheManager";
import { deleteNote } from "../note/deleteNote";
import type { NoteType } from "../note/note";
import { schedulableModel } from "./CardScheduler";
import type { Card, KnownLevel } from "./card";
import { type FamiliarRange, daysFor, knownSchedule } from "./known";

/** The new schedule for each card that it changes, in the order given. */
export function knownUpdates(
  cards: Card<NoteType>[],
  scheduler: FSRS,
  range: FamiliarRange,
  level: KnownLevel,
  now = new Date(),
  random = Math.random
) {
  const updates: {
    id: string;
    deck: string;
    model: Card<NoteType>["model"];
    known: KnownLevel;
  }[] = [];
  for (const card of cards) {
    // Known stays known; marking it familiar again would bring it back.
    if (card.known === "known") continue;
    const easy = scheduler.repeat(schedulableModel(card.model), now)[
      Rating.Easy
    ];
    const marked = knownSchedule(easy, now, daysFor(level, range, random));
    // A card already scheduled further out keeps its date (only the level
    // changes).
    const current = new Date(card.model.due).getTime();
    const model =
      card.model.state === State.Review && current >= marked.card.due.getTime()
        ? card.model
        : marked.card;
    if (model === card.model && card.known === level) continue;
    updates.push({ id: card.id, deck: card.deck, model, known: level });
  }
  return updates;
}

/** Marks the cards familiar or known; returns how many changed. */
export async function markCardsKnown(
  cards: Card<NoteType>[],
  scheduler: FSRS,
  range: FamiliarRange,
  level: KnownLevel
) {
  const updates = knownUpdates(cards, scheduler, range, level);
  await db.cards.bulkUpdate(
    updates.map(({ id, model, known }) => ({
      key: id,
      changes: { model, known },
    }))
  );
  for (const deck of new Set(updates.map((u) => u.deck))) {
    await invalidateDeckStatsCache(deck);
  }
  return updates.length;
}

/** A note's cards, marked familiar or known (the reader's word panel). */
export async function markNoteKnown(
  noteId: string,
  scheduler: FSRS,
  range: FamiliarRange,
  level: KnownLevel
) {
  const cards = await db.cards.where("note").equals(noteId).toArray();
  return markCardsKnown(cards, scheduler, range, level);
}

/** Cards never reviewed: made, then not studied yet. */
export function neverReviewed(cards: Card<NoteType>[]) {
  return (
    cards.length > 0 &&
    cards.every((c) => c.model.state === State.New && c.model.reps === 0)
  );
}

/**
 * A word marked known in the reader: its card goes too if it was never
 * reviewed (added, then found to be known); a card already studied is kept,
 * marked known, so its history stays. Says which was done.
 */
export async function knownWordCard(
  noteId: string,
  scheduler: FSRS,
  range: FamiliarRange
): Promise<"deleted" | "marked" | "none"> {
  const cards = await db.cards.where("note").equals(noteId).toArray();
  const note = await db.notes.get(noteId);
  if (!note || cards.length === 0) return "none";
  if (neverReviewed(cards)) {
    await deleteNote(note);
    return "deleted";
  }
  await markCardsKnown(cards, scheduler, range, "known");
  return "marked";
}
