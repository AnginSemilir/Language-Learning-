// "Known" on a flashcard: the card goes away for a while, as if it had been
// answered Easy with a memory that lasts that long, and comes back for a
// check at a random time between the days set in Settings → Learning (one to
// six months by default), so cards marked known together don't all come back
// on the same day. When it does come back, it's an ordinary review.
import { type SchedulingInfo, State } from "fsrs.js";
import { defaultSettings } from "../settings/defaultSettings";
import { useSetting } from "../settings/hooks/useSetting";
import { integerSetting } from "../settings/sanitize";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days a known card stays away: at least `min`, at most `max`. */
export interface KnownRange {
  min: number;
  max: number;
}

/** The range from the settings: whole days, min ≤ max, within the maximum interval. */
export function knownRange(
  min: unknown,
  max: unknown,
  maximumInterval: number
): KnownRange {
  const cap = Math.max(1, Math.round(maximumInterval));
  const low = Math.min(
    integerSetting(min, defaultSettings["#learn_knownMinDays"], 1, 36500),
    cap
  );
  const high = Math.min(
    integerSetting(max, defaultSettings["#learn_knownMaxDays"], 1, 36500),
    cap
  );
  return { min: Math.min(low, high), max: Math.max(low, high) };
}

/** The range set in Settings → Learning, for this scheduler. */
export function useKnownRange(maximumInterval: number): KnownRange {
  const [min] = useSetting("#learn_knownMinDays");
  const [max] = useSetting("#learn_knownMaxDays");
  return knownRange(min, max, maximumInterval);
}

/** A number of days in the range, any of them equally likely. */
export function knownDays(range: KnownRange, random = Math.random) {
  return range.min + Math.floor(random() * (range.max - range.min + 1));
}

/**
 * The schedule for a card marked known, built on its Easy answer so the
 * history and difficulty read like a very easy review.
 */
export function knownSchedule(
  easy: SchedulingInfo,
  now: Date,
  days: number
): SchedulingInfo {
  const away = Math.max(1, Math.round(days));
  return {
    card: {
      ...easy.card,
      state: State.Review,
      // At the requested retention FSRS's next interval is about the
      // stability: the card is remembered that long, so a Good when it
      // comes back sends it further out.
      stability: Math.max(easy.card.stability, away),
      scheduled_days: away,
      due: new Date(now.getTime() + away * DAY_MS),
      last_review: now,
    },
    review_log: { ...easy.review_log, scheduled_days: away, review: now },
  };
}

/** "6 days", "4 months", "100 years". */
export function describeDays(days: number) {
  if (days < 60) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 365 * 2) return `${Math.round(days / 30)} months`;
  return `${Math.round(days / 365)} years`;
}

/** "1–6 months", "10–20 days". */
export function describeRange({ min, max }: KnownRange) {
  if (min === max) return describeDays(min);
  if (max < 60) return `${min}–${max} days`;
  if (max < 365 * 2) {
    const from = Math.max(1, Math.round(min / 30));
    const to = Math.round(max / 30);
    return from === to ? `${to} months` : `${from}–${to} months`;
  }
  return `${describeDays(min)} to ${describeDays(max)}`;
}
