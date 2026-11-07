// Pulau Kata, the island that grows as you learn. Its trees are your
// flashcards, each drawn at its stage of growth (seed to grand oak, see
// logic/growth); its buildings arrive as you level up, each one a new
// Indonesian word; villagers move in as you know more words, and the
// campfire burns on days you study.

import {
  emptyDailyStats,
  mergeActivity,
  reviewsByDay,
} from "@/lector/lib/dailyStats";
import {
  type StreakResult,
  activeDateSet,
  computeStreaks,
} from "@/lector/lib/streak";
import type { DailyStats } from "@/lector/types";
import type { Card } from "../card/card";
import { type GrowthStage, growthStage } from "../growth";
import type { NoteType } from "../note/note";
import { BUILDINGS, type Building } from "./buildings";
import { type Found, type IslandDay, discover } from "./discoveries";
import { replay } from "./journey";
import {
  type LevelInfo,
  type Quest,
  levelFor,
  questsFor,
  totalXp,
} from "./progress";

export { BUILDINGS, type Building } from "./buildings";

/** At most this many trees are drawn; the forest count has the rest. */
export const MAX_TREES = 42;

/** More trees grow on the island across the water, once it's there. */
export const FAR_TREES = 16;

/** Villagers: one, plus one more for every 100 words known, up to 6. */
export const MAX_VILLAGERS = 6;

export type DayPhase = "dawn" | "day" | "dusk" | "night";

export function dayPhase(hour: number): DayPhase {
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 18) return "day";
  if (hour >= 18 && hour < 20) return "dusk";
  return "night";
}

export interface Tree {
  /** The note the tree stands for. */
  id: string;
  stage: GrowthStage;
}

export interface WorldState {
  level: LevelInfo;
  streak: StreakResult;
  /** How many of your words are at each stage of growth. */
  forest: Record<GrowthStage, number>;
  /** The trees drawn on the island, the same ones from day to day. */
  trees: Tree[];
  /** And on the island across the water (level 9). */
  farTrees: Tree[];
  unlocked: Building[];
  next: Building | undefined;
  villagers: number;
  knownWords: number;
  today: DailyStats;
  quests: Quest[];
  questsDone: boolean;
  studiedToday: boolean;
  phase: DayPhase;
  /** Animals living on the island (see discoveries.ts). */
  animals: string[];
  /** Everything found so far, in the order found. */
  found: Found[];
  /** Today on the island: weather, goings-on, visitors, a bottle. */
  day: IslandDay;
}

/** A stable number for an id, to place the same trees in the same spots. */
export function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * One tree per note, at the stage of its Indonesian → English card (or its
 * only card), as the review screen shows it.
 */
export function treesOf(cards: Card<NoteType>[]): Tree[] {
  const byNote = new Map<string, Card<NoteType>>();
  for (const card of cards) {
    const content = card.content as { frontIsField1?: boolean } | undefined;
    const reverse = content?.frontIsField1 === false;
    if (!byNote.has(card.note) || !reverse) byNote.set(card.note, card);
  }
  return [...byNote].map(([id, card]) => ({
    id,
    stage: card.model ? growthStage(card.model) : 0,
  }));
}

export function forestOf(trees: Tree[]): Record<GrowthStage, number> {
  const forest: Record<GrowthStage, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const tree of trees) forest[tree.stage]++;
  return forest;
}

/**
 * The trees to draw: a fixed sample of your words (by a hash of the note, so
 * the same words stand on the island from day to day), the most grown first:
 * they go on the crest of the hill, the seedlings in front where they show.
 */
export function treeSample(trees: Tree[], max = MAX_TREES): Tree[] {
  return [...trees]
    .sort((a, b) => hashId(a.id) - hashId(b.id))
    .slice(0, max)
    .sort((a, b) => b.stage - a.stage);
}

export function buildWorld(input: {
  daily: DailyStats[];
  cards: Card<NoteType>[];
  knownWords: number;
  today: string;
  now: Date;
  dayKeyOf: (date: Date) => string;
}): WorldState {
  const days = mergeActivity(
    input.daily,
    reviewsByDay(input.cards, input.dayKeyOf)
  );
  const today =
    days.find((d) => d.date === input.today) ?? emptyDailyStats(input.today);
  const level = levelFor(totalXp(days));
  const streak = computeStreaks(activeDateSet(days), input.today);
  const trees = treesOf(input.cards);
  const forest = forestOf(trees);
  const quests = questsFor(today);
  // The island across gets every fourth tree, so both have grown ones.
  const across = level.level >= 9 ? FAR_TREES : 0;
  const sample = treeSample(trees, MAX_TREES + across);
  const far = sample.filter((_, i) => i % 4 === 3).slice(0, across);
  const near = sample.filter((t) => !far.includes(t)).slice(0, MAX_TREES);
  const { found, day } = discover({
    journey: replay(days),
    today: input.today,
    island: { forest, knownWords: input.knownWords },
  });
  return {
    level,
    streak,
    forest,
    trees: near,
    farTrees: far,
    unlocked: BUILDINGS.filter((b) => b.level <= level.level),
    next: BUILDINGS.find((b) => b.level > level.level),
    villagers: Math.min(MAX_VILLAGERS, 1 + Math.floor(input.knownWords / 100)),
    knownWords: input.knownWords,
    today,
    quests,
    questsDone: quests.every((q) => q.complete),
    studiedToday: streak.activeToday,
    phase: dayPhase(input.now.getHours()),
    animals: found.filter((f) => f.kind === "animal").map((f) => f.id),
    found,
    day,
  };
}
