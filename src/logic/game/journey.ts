// The island's history, replayed day by day from the activity Kartu already
// records: what you did each day, and your XP, level and streak at the end
// of it. Milestones and lucky finds are worked out from it, so they are the
// same on every device and nothing extra is stored.

import { addDaysToDateString } from "@/lector/lib/dates";
import { isActiveDay } from "@/lector/lib/streak";
import type { DailyStats } from "@/lector/types";
import { dayXp, levelFor, questsComplete } from "./progress";

export interface Totals {
  reviews: number;
  cloze: number;
  wordsRead: number;
  lookups: number;
  markedKnown: number;
  saved: number;
  games: number;
  gamePoints: number;
  activeDays: number;
  /** Days with all three quests done. */
  questDays: number;
}

export interface JourneyDay {
  date: string;
  active: boolean;
  /** XP and level at the end of the day. */
  xp: number;
  level: number;
  /** Study days in a row up to this one (0 when it wasn't a study day). */
  streak: number;
  longestStreak: number;
  totals: Totals;
}

const NO_TOTALS: Totals = {
  reviews: 0,
  cloze: 0,
  wordsRead: 0,
  lookups: 0,
  markedKnown: 0,
  saved: 0,
  games: 0,
  gamePoints: 0,
  activeDays: 0,
  questDays: 0,
};

/** A number in [0, 1) for a seed: the same seed always gives the same one. */
export function chance(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // MurmurHash3's finaliser, so seeds a letter apart land far apart.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const count = (n: number | undefined) => (Number.isFinite(n) ? Number(n) : 0);

function addDay(totals: Totals, day: DailyStats, active: boolean): Totals {
  return {
    reviews: totals.reviews + count(day.ankiReviews),
    cloze: totals.cloze + count(day.clozePracticed),
    wordsRead: totals.wordsRead + count(day.wordsRead),
    lookups: totals.lookups + count(day.dictionaryLookups),
    markedKnown: totals.markedKnown + count(day.wordsMarkedKnown),
    saved: totals.saved + count(day.newWordsSaved),
    games: totals.games + count(day.gamesPlayed),
    gamePoints: totals.gamePoints + count(day.gamePoints),
    activeDays: totals.activeDays + (active ? 1 : 0),
    questDays: totals.questDays + (questsComplete(day) ? 1 : 0),
  };
}

/** Each day with activity, oldest first, with the running totals. */
export function replay(days: DailyStats[]): JourneyDay[] {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const journey: JourneyDay[] = [];
  let totals = NO_TOTALS;
  let xp = 0;
  let streak = 0;
  let longestStreak = 0;
  let lastActive: string | undefined;
  for (const day of sorted) {
    const active = isActiveDay(day);
    xp += dayXp(day);
    if (active) {
      const followsOn =
        lastActive !== undefined &&
        addDaysToDateString(lastActive, 1) === day.date;
      streak = followsOn ? streak + 1 : 1;
      lastActive = day.date;
      longestStreak = Math.max(longestStreak, streak);
    }
    totals = addDay(totals, day, active);
    journey.push({
      date: day.date,
      active,
      xp,
      level: levelFor(xp).level,
      streak: active ? streak : 0,
      longestStreak,
      totals,
    });
  }
  return journey;
}
