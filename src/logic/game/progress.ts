// Experience points, levels and the day's three quests, worked out from the
// activity Kartu already records (card review logs, practice, reading, word
// games). Nothing extra is stored: XP is the same on every device, and all
// the studying done before the island existed counts too.

import type { DailyStats } from "@/lector/types";

/** XP for each kind of study. */
export const XP = {
  /** Each flashcard answer. */
  flashcardAnswer: 2,
  /** Each gap-fill sentence. */
  clozeSentence: 4,
  /** Words read for 1 XP. */
  wordsPerXp: 25,
  /** Each word looked up while reading. */
  lookup: 1,
  /** Each word marked known while reading. */
  wordMarkedKnown: 1,
  /** Each new word saved while reading. */
  wordSaved: 2,
  /** Game points for 1 XP. */
  gamePointsPerXp: 10,
  /** All three of the day's quests done. */
  questBonus: 50,
} as const;

/** A count that may be missing from an older row. */
const count = (n: number | undefined) => (Number.isFinite(n) ? Number(n) : 0);

export type QuestId = "review" | "game" | "read";

export interface Quest {
  id: QuestId;
  title: string;
  /** In Indonesian, to learn along the way. */
  titleId: string;
  done: number;
  target: number;
  complete: boolean;
}

/** The day's quests: the same three every day, so they become a habit. */
export function questsFor(day: DailyStats | undefined): Quest[] {
  const reviews = count(day?.ankiReviews);
  const games = count(day?.gamesPlayed);
  const read = count(day?.wordsRead) > 0 ? 5 : count(day?.clozePracticed);
  const quest = (
    id: QuestId,
    title: string,
    titleId: string,
    done: number,
    target: number
  ): Quest => ({
    id,
    title,
    titleId,
    done: Math.min(done, target),
    target,
    complete: done >= target,
  });
  return [
    quest("review", "Review 20 flashcards", "Ulangi 20 kartu", reviews, 20),
    quest("game", "Play a word game", "Main satu permainan", games, 1),
    quest(
      "read",
      "Read a page or practise 5 sentences",
      "Baca atau latihan",
      read,
      5
    ),
  ];
}

export function questsComplete(day: DailyStats | undefined): boolean {
  return questsFor(day).every((q) => q.complete);
}

/** XP earned on one day. */
export function dayXp(day: DailyStats): number {
  return (
    count(day.ankiReviews) * XP.flashcardAnswer +
    count(day.clozePracticed) * XP.clozeSentence +
    Math.floor(count(day.wordsRead) / XP.wordsPerXp) +
    count(day.dictionaryLookups) * XP.lookup +
    count(day.wordsMarkedKnown) * XP.wordMarkedKnown +
    count(day.newWordsSaved) * XP.wordSaved +
    Math.floor(count(day.gamePoints) / XP.gamePointsPerXp) +
    (questsComplete(day) ? XP.questBonus : 0)
  );
}

export function totalXp(days: DailyStats[]): number {
  return days.reduce((sum, day) => sum + dayXp(day), 0);
}

/**
 * Total XP that reaches a level: 0 for level 1, then 100, 300, 600, 1,000…
 * Each level takes 100 XP more than the one before.
 */
export function xpForLevel(level: number): number {
  return 50 * (level - 1) * level;
}

export interface LevelInfo {
  level: number;
  xp: number;
  /** XP at which this level started and the next one starts. */
  levelStart: number;
  nextLevel: number;
  /** 0–1 of the way to the next level. */
  progress: number;
}

export function levelFor(xp: number): LevelInfo {
  const total = Math.max(0, Math.floor(count(xp)));
  let level = 1;
  while (xpForLevel(level + 1) <= total) level++;
  const levelStart = xpForLevel(level);
  const nextLevel = xpForLevel(level + 1);
  return {
    level,
    xp: total,
    levelStart,
    nextLevel,
    progress: (total - levelStart) / (nextLevel - levelStart),
  };
}
