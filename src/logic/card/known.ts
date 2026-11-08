// Familiar and Known on a flashcard.
//
// Familiar ("probably known"): the card goes away and comes back once, for a
// check, at a random time between the days set in Settings → Learning (one
// to six months by default), so cards marked together don't all come back on
// the same day. Any answer but Again then makes it known; Again sends it back
// to ordinary learning.
//
// Known: the card doesn't come back (it's due in 100 years, FSRS's longest
// interval, whatever the maximum interval is set to).
//
// Either way the card is scheduled as if it had been answered Easy with a
// memory that lasts that long, and the card's `known` field says which.
import { type SchedulingInfo, State } from "fsrs.js";
import { defaultSettings } from "../settings/defaultSettings";
import { useSetting } from "../settings/hooks/useSetting";
import { integerSetting } from "../settings/sanitize";
import type { KnownLevel } from "./card";

const DAY_MS = 24 * 60 * 60 * 1000;
/** How far away a known card is sent: FSRS's longest interval. */
export const KNOWN_DAYS = 36500;

/** Days a familiar card stays away: at least `min`, at most `max`. */
export interface FamiliarRange {
  min: number;
  max: number;
}

/** The range from the settings: whole days, min ≤ max, within the maximum interval. */
export function familiarRange(
  min: unknown,
  max: unknown,
  maximumInterval: number
): FamiliarRange {
  const cap = Math.max(1, Math.round(maximumInterval));
  const low = Math.min(
    integerSetting(min, defaultSettings["#learn_familiarMinDays"], 1, 36500),
    cap
  );
  const high = Math.min(
    integerSetting(max, defaultSettings["#learn_familiarMaxDays"], 1, 36500),
    cap
  );
  return { min: Math.min(low, high), max: Math.max(low, high) };
}

/** The range set in Settings → Learning, for this scheduler. */
export function useFamiliarRange(maximumInterval: number): FamiliarRange {
  const [min] = useSetting("#learn_familiarMinDays");
  const [max] = useSetting("#learn_familiarMaxDays");
  return familiarRange(min, max, maximumInterval);
}

/** A number of days in the range, any of them equally likely. */
export function familiarDays(range: FamiliarRange, random = Math.random) {
  return range.min + Math.floor(random() * (range.max - range.min + 1));
}

/** Days a card marked at this level stays away. */
export function daysFor(
  level: KnownLevel,
  range: FamiliarRange,
  random = Math.random
) {
  return level === "known" ? KNOWN_DAYS : familiarDays(range, random);
}

/**
 * The schedule for a card sent away for `days`, built on an answer (Easy
 * when marked, the real answer when a familiar card is got right) so the
 * history and difficulty read like a very easy review.
 */
export function knownSchedule(
  answer: SchedulingInfo,
  now: Date,
  days: number
): SchedulingInfo {
  const away = Math.max(1, Math.round(days));
  return {
    card: {
      ...answer.card,
      state: State.Review,
      // At the requested retention FSRS's next interval is about the
      // stability: the card is remembered that long, so a Good when it
      // comes back sends it further out.
      stability: Math.max(answer.card.stability, away),
      scheduled_days: away,
      due: new Date(now.getTime() + away * DAY_MS),
      last_review: now,
    },
    review_log: { ...answer.review_log, scheduled_days: away, review: now },
  };
}

/** "6 days", "4 months", "100 years". */
export function describeDays(days: number) {
  if (days < 60) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 365 * 2) return `${Math.round(days / 30)} months`;
  return `${Math.round(days / 365)} years`;
}

/** "1–6 months", "10–20 days". */
export function describeRange({ min, max }: FamiliarRange) {
  if (min === max) return describeDays(min);
  if (max < 60) return `${min}–${max} days`;
  if (max < 365 * 2) {
    const from = Math.max(1, Math.round(min / 30));
    const to = Math.round(max / 30);
    return from === to ? `${to} months` : `${from}–${to} months`;
  }
  return `${describeDays(min)} to ${describeDays(max)}`;
}
