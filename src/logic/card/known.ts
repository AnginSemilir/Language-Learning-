// "Known" on a flashcard: the card goes as far into the future as the
// scheduler allows (Settings → Learning → Maximum interval), as if it had
// been answered Easy with a memory that lasts that long. It comes back once
// that time has passed, like any review.
import { type SchedulingInfo, State } from "fsrs.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The schedule for a card marked known, built on its Easy answer so the
 * history and difficulty read like a very easy review.
 */
export function knownSchedule(
  easy: SchedulingInfo,
  now: Date,
  maximumInterval: number
): SchedulingInfo {
  const days = Math.max(1, Math.round(maximumInterval));
  return {
    card: {
      ...easy.card,
      state: State.Review,
      // At the requested retention FSRS's next interval is about the
      // stability, so a later Good keeps the card this far out.
      stability: Math.max(easy.card.stability, days),
      scheduled_days: days,
      due: new Date(now.getTime() + days * DAY_MS),
      last_review: now,
    },
    review_log: { ...easy.review_log, scheduled_days: days, review: now },
  };
}

/** "6 days", "4 months", "100 years". */
export function describeDays(days: number) {
  if (days < 60) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 365 * 2) {
    const months = Math.round(days / 30);
    return `${months} months`;
  }
  return `${Math.round(days / 365)} years`;
}
