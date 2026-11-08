// Marking many cards known at once (a deck, or cards picked in Manage
// Cards), for cards imported that are already known. Each comes back for a
// check at its own random time in the known range. No review is logged, so
// today's limits and statistics are left as they are; a card already
// scheduled further out than its new date keeps its schedule.
import { type FSRS, Rating, State } from "fsrs.js";
import { db } from "../db";
import { invalidateDeckStatsCache } from "../deck/deckStatsCacheManager";
import type { NoteType } from "../note/note";
import { schedulableModel } from "./CardScheduler";
import type { Card } from "./card";
import { type KnownRange, knownDays, knownSchedule } from "./known";

/** The new schedule for each card that it moves, in the order given. */
export function knownUpdates(
  cards: Card<NoteType>[],
  scheduler: FSRS,
  range: KnownRange,
  now = new Date(),
  random = Math.random
) {
  const updates: {
    id: string;
    deck: string;
    model: Card<NoteType>["model"];
  }[] = [];
  for (const card of cards) {
    const easy = scheduler.repeat(schedulableModel(card.model), now)[
      Rating.Easy
    ];
    const known = knownSchedule(easy, now, knownDays(range, random));
    const current = new Date(card.model.due).getTime();
    if (
      card.model.state === State.Review &&
      current >= known.card.due.getTime()
    ) {
      continue;
    }
    updates.push({ id: card.id, deck: card.deck, model: known.card });
  }
  return updates;
}

/** Marks the cards known; returns how many were moved. */
export async function markCardsKnown(
  cards: Card<NoteType>[],
  scheduler: FSRS,
  range: KnownRange
) {
  const updates = knownUpdates(cards, scheduler, range);
  await db.cards.bulkUpdate(
    updates.map(({ id, model }) => ({ key: id, changes: { model } }))
  );
  for (const deck of new Set(updates.map((u) => u.deck))) {
    await invalidateDeckStatsCache(deck);
  }
  return updates.length;
}
