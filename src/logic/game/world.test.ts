import { emptyDailyStats } from "@/lector/lib/dailyStats";
import { State } from "fsrs.js";
import { describe, expect, it } from "vitest";
import type { Card } from "../card/card";
import type { NoteType } from "../note/note";
import {
  BUILDINGS,
  MAX_TREES,
  buildWorld,
  dayPhase,
  forestOf,
  treeSample,
  treesOf,
} from "./world";

function card(
  note: string,
  state: State,
  scheduledDays: number,
  options: { reverse?: boolean; reviews?: string[] } = {}
): Card<NoteType> {
  return {
    id: `${note}-${options.reverse ? "back" : "front"}`,
    note,
    deck: "deck",
    creationDate: new Date("2026-01-01"),
    content: { frontIsField1: !options.reverse },
    model: { state, scheduled_days: scheduledDays },
    history: (options.reviews ?? []).map((review) => ({ review })),
  } as unknown as Card<NoteType>;
}

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

describe("dayPhase", () => {
  it("follows the hour of the day", () => {
    expect(dayPhase(5)).toBe("dawn");
    expect(dayPhase(12)).toBe("day");
    expect(dayPhase(18)).toBe("dusk");
    expect(dayPhase(23)).toBe("night");
    expect(dayPhase(2)).toBe("night");
  });
});

describe("trees", () => {
  it("draws each word at the stage of its Indonesian → English card", () => {
    const trees = treesOf([
      card("makan", State.Review, 40, { reverse: true }),
      card("makan", State.New, 0),
      card("minum", State.Review, 120),
    ]);
    expect(trees).toEqual([
      { id: "makan", stage: 0 },
      { id: "minum", stage: 4 },
    ]);
    expect(forestOf(trees)).toEqual({ 0: 1, 1: 0, 2: 0, 3: 0, 4: 1 });
  });

  it("keeps the same sample of trees, at most MAX_TREES", () => {
    const many = Array.from({ length: 100 }, (_, i) =>
      card(`word-${i}`, State.Review, i)
    );
    const first = treeSample(treesOf(many));
    expect(first).toHaveLength(MAX_TREES);
    expect(treeSample(treesOf([...many].reverse()))).toEqual(first);
    const stages = first.map((t) => t.stage);
    expect([...stages].sort((a, b) => b - a)).toEqual(stages);
  });
});

describe("buildWorld", () => {
  const today = "2026-11-07";
  const reviewedToday = Array.from(
    { length: 20 },
    (_, i) => `2026-11-07T09:${String(i).padStart(2, "0")}:00Z`
  );

  it("counts today's flashcard answers from the cards' logs", () => {
    const world = buildWorld({
      daily: [{ ...emptyDailyStats(today), gamesPlayed: 1, gamePoints: 300 }],
      cards: [card("rumah", State.Learning, 0, { reviews: reviewedToday })],
      knownWords: 250,
      today,
      now: new Date("2026-11-07T21:00:00"),
      dayKeyOf: dayKey,
    });
    expect(world.today.ankiReviews).toBe(20);
    expect(world.studiedToday).toBe(true);
    expect(world.streak.current).toBe(1);
    expect(world.quests.map((q) => q.complete)).toEqual([true, true, false]);
    // 20 answers × 2 + 300 game points ÷ 10.
    expect(world.level.xp).toBe(70);
    expect(world.villagers).toBe(3);
    expect(world.phase).toBe("night");
  });

  it("unlocks buildings by level and names the next one", () => {
    const busyDays = Array.from({ length: 30 }, (_, i) => ({
      ...emptyDailyStats(`2026-10-${String(i + 1).padStart(2, "0")}`),
      clozePracticed: 25,
    }));
    const world = buildWorld({
      daily: busyDays,
      cards: [],
      knownWords: 0,
      today,
      now: new Date("2026-11-07T10:00:00"),
      dayKeyOf: dayKey,
    });
    // 30 days × 25 sentences × 4 XP = 3,000 XP: level 8.
    expect(world.level.level).toBe(8);
    expect(world.unlocked.map((b) => b.id)).toEqual(
      BUILDINGS.filter((b) => b.level <= 8).map((b) => b.id)
    );
    expect(world.next?.id).toBe("pulau-seberang");
    expect(world.studiedToday).toBe(false);
    expect(world.villagers).toBe(1);
    // Everything that came on the way, and the animals that live here now.
    const levels = world.found.filter((f) => f.kind === "level");
    expect(levels.map((f) => f.id)).toEqual(
      [2, 3, 4, 5, 6, 7, 8].map((l) => `level-${l}`)
    );
    expect(world.animals).toContain("ayam");
    expect(world.farTrees).toEqual([]);
    expect(world.day.date).toBe(today);
  });
});
