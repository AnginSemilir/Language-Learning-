import type { DailyStats } from "../types";

/** A day with no activity yet. */
export function emptyDailyStats(date: string): DailyStats {
  return {
    date,
    wordsRead: 0,
    newWordsSaved: 0,
    wordsMarkedKnown: 0,
    minutesRead: 0,
    clozePracticed: 0,
    points: 0,
    dictionaryLookups: 0,
    ankiReviews: 0,
    gamesPlayed: 0,
    gamePoints: 0,
  };
}

/**
 * Each day's activity, one row per day: the rows of all devices (already
 * added up), with each day's flashcard answers taken from the cards' own
 * review logs, which sync with the cards. Every field is a number.
 */
export function mergeActivity(
  daily: DailyStats[],
  reviewsByDay: Map<string, number>
): DailyStats[] {
  const byDate = new Map<string, DailyStats>();
  for (const row of daily) {
    const day = emptyDailyStats(row.date);
    for (const field of Object.keys(day) as (keyof DailyStats)[]) {
      if (field === "date") continue;
      const value = Number(row[field]);
      day[field] = Number.isFinite(value) ? value : 0;
    }
    byDate.set(row.date, day);
  }
  for (const [date, n] of reviewsByDay) {
    const day = byDate.get(date) ?? emptyDailyStats(date);
    day.ankiReviews = n;
    byDate.set(date, day);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** How many flashcard answers were given on each day, by the cards' logs. */
export function reviewsByDay(
  cards: { history?: { review: Date | string }[] }[],
  dayKeyOf: (date: Date) => string
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    for (const log of card.history ?? []) {
      const date = new Date(log.review);
      if (Number.isNaN(date.getTime())) continue;
      const key = dayKeyOf(date);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}
