// Anki-style daily limits: which cards a study session offers today.
//
// Learning cards always come. Due reviews are capped by the reviews-per-day
// limit and new cards by the new-cards-per-day limit, minus what was already
// done since the day started (the "next day starts at" hour). Optionally a
// card's siblings (the other side of a double-sided note) wait until the next
// day once one of them has been studied or queued today, as Anki's "bury"
// options do. The same queue gives the counts shown on the deck page.

import { State } from "fsrs.js";
import type { Card } from "./card/card";
import type { NoteType } from "./note/note";

export type NewCardOrder = "added" | "random";
export type NewReviewOrder = "mixed" | "after" | "before";

export interface DailyLimits {
  newPerDay: number;
  reviewsPerDay: number;
  newOrder: NewCardOrder;
  buryNewSiblings: boolean;
  buryReviewSiblings: boolean;
  /** The hour (0–23) at which a new study day starts. */
  dayStartHour: number;
}

export function startOfStudyDay(now: Date, dayStartHour: number): Date {
  const start = new Date(now);
  start.setHours(dayStartHour, 0, 0, 0);
  if (now.getHours() < dayStartHour) start.setDate(start.getDate() - 1);
  return start;
}

export interface DailyQueue {
  learning: Card<NoteType>[];
  reviews: Card<NoteType>[];
  newCards: Card<NoteType>[];
  newDoneToday: number;
  reviewsDoneToday: number;
  /** Every answer given today, as Anki's "studied N cards today" counts them. */
  answersToday: number;
}

function time(date: Date | string) {
  return new Date(date).getTime();
}

/** A stable shuffle key: the same order all day, a new one tomorrow. */
function shuffleKey(id: string, day: number) {
  let h = 0x811c9dc5 ^ day;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function buildDailyQueue(
  cards: Card<NoteType>[],
  limits: DailyLimits,
  now = new Date()
): DailyQueue {
  const dayStart = time(startOfStudyDay(now, limits.dayStartHour));

  let newDoneToday = 0;
  let reviewsDoneToday = 0;
  let answersToday = 0;
  const studiedToday = new Set<string>();
  for (const card of cards) {
    const history = card.history ?? [];
    if (history.length > 0 && time(history[0].review) >= dayStart) {
      newDoneToday++;
    }
    for (const log of history) {
      if (time(log.review) < dayStart) continue;
      studiedToday.add(card.note);
      answersToday++;
      // As in Anki, a review is an answer to a card that had graduated.
      if (log.state === State.Review) reviewsDoneToday++;
    }
  }

  const learning = cards.filter(
    (c) =>
      c.model.state === State.Learning || c.model.state === State.Relearning
  );
  const queuedNotes = new Set(learning.map((c) => c.note));

  // A card without a valid due date (damaged data) counts as due, so it comes
  // up and gets a fresh schedule instead of hiding for ever.
  const isDue = (c: Card<NoteType>) => {
    const dueTime = time(c.model.due);
    return !Number.isFinite(dueTime) || dueTime <= time(now);
  };
  const due = cards
    .filter((c) => c.model.state === State.Review && isDue(c))
    .sort((a, b) => (time(a.model.due) || 0) - (time(b.model.due) || 0));
  const reviewsLeft = Math.max(0, limits.reviewsPerDay - reviewsDoneToday);
  const reviews: Card<NoteType>[] = [];
  for (const card of due) {
    if (reviews.length >= reviewsLeft) break;
    if (
      limits.buryReviewSiblings &&
      (studiedToday.has(card.note) || queuedNotes.has(card.note))
    ) {
      continue;
    }
    reviews.push(card);
    queuedNotes.add(card.note);
  }

  const day = Math.floor(dayStart / 86400000);
  const fresh = cards
    .filter((c) => c.model.state === State.New)
    .sort((a, b) =>
      limits.newOrder === "random"
        ? shuffleKey(a.id, day) - shuffleKey(b.id, day)
        : time(a.creationDate) - time(b.creationDate)
    );
  const newLeft = Math.max(0, limits.newPerDay - newDoneToday);
  const newCards: Card<NoteType>[] = [];
  for (const card of fresh) {
    if (newCards.length >= newLeft) break;
    if (
      limits.buryNewSiblings &&
      (studiedToday.has(card.note) || queuedNotes.has(card.note))
    ) {
      continue;
    }
    newCards.push(card);
    queuedNotes.add(card.note);
  }

  // As Anki's default sort ("card type, then order gathered"): the front →
  // back cards first, the reverse cards of the same notes later on.
  if (limits.newOrder === "added") {
    const reverse = (c: Card<NoteType>) =>
      (c.content as { frontIsField1?: boolean } | undefined)?.frontIsField1 ===
      false
        ? 1
        : 0;
    newCards.sort((a, b) => reverse(a) - reverse(b));
  }

  return {
    learning,
    reviews,
    newCards,
    newDoneToday,
    reviewsDoneToday,
    answersToday,
  };
}
