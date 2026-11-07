import { emptyDailyStats } from "@/lector/lib/dailyStats";
import type { DailyStats } from "@/lector/types";
import { describe, expect, it } from "vitest";
import {
  dayXp,
  levelFor,
  questsComplete,
  questsFor,
  totalXp,
  xpForLevel,
} from "./progress";

describe("levels", () => {
  it("needs 100 XP more for each level", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(300);
    expect(xpForLevel(5)).toBe(1000);
  });

  it("finds the level and how far it is to the next", () => {
    expect(levelFor(0)).toMatchObject({
      level: 1,
      levelStart: 0,
      nextLevel: 100,
      progress: 0,
    });
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100).level).toBe(2);
    expect(levelFor(450)).toMatchObject({
      level: 3,
      levelStart: 300,
      nextLevel: 600,
      progress: 0.5,
    });
  });

  it("treats a missing or negative total as none", () => {
    expect(levelFor(Number.NaN).level).toBe(1);
    expect(levelFor(-5).xp).toBe(0);
  });
});

describe("dayXp", () => {
  it("adds up each kind of study", () => {
    const day: DailyStats = {
      ...emptyDailyStats("2026-11-07"),
      ankiReviews: 10,
      clozePracticed: 2,
      wordsRead: 260,
      dictionaryLookups: 3,
      wordsMarkedKnown: 4,
      newWordsSaved: 1,
      gamePoints: 155,
    };
    // 10×2 + 2×4 + 260/25 + 3 + 4 + 1×2 + 155/10, rounded down.
    expect(dayXp(day)).toBe(62);
  });

  it("adds a bonus when all three quests are done", () => {
    const day: DailyStats = {
      ...emptyDailyStats("2026-11-07"),
      ankiReviews: 20,
      gamesPlayed: 1,
      wordsRead: 100,
    };
    expect(questsComplete(day)).toBe(true);
    expect(dayXp(day)).toBe(20 * 2 + 4 + 50);
  });

  it("skips fields an older row doesn't have", () => {
    const day = { date: "2026-01-01", ankiReviews: 5 } as DailyStats;
    expect(dayXp(day)).toBe(10);
    expect(totalXp([day, day])).toBe(20);
  });
});

describe("questsFor", () => {
  it("starts the day with nothing done", () => {
    const quests = questsFor(undefined);
    expect(quests.map((q) => q.id)).toEqual(["review", "game", "read"]);
    expect(quests.every((q) => q.done === 0 && !q.complete)).toBe(true);
  });

  it("caps progress at the target", () => {
    const day = { ...emptyDailyStats("d"), ankiReviews: 57 };
    expect(questsFor(day)[0]).toMatchObject({ done: 20, complete: true });
  });

  it("counts reading or five practised sentences as the third quest", () => {
    const read = { ...emptyDailyStats("d"), wordsRead: 30 };
    expect(questsFor(read)[2].complete).toBe(true);
    const practised = { ...emptyDailyStats("d"), clozePracticed: 4 };
    expect(questsFor(practised)[2]).toMatchObject({ done: 4, complete: false });
  });
});
