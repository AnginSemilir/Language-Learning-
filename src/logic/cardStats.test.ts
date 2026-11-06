import { Rating, State } from "fsrs.js";
import { describe, expect, it } from "vitest";
import type { Card } from "./card/card";
import { bestHour, computeCardStats, ratio } from "./cardStats";
import type { NoteType } from "./note/note";

const NOW = new Date(2026, 10, 6, 15, 0, 0); // 6 Nov, 3pm; the day starts at 4am
const at = (day: number, hour = 9) => new Date(2026, 10, 6 + day, hour, 0, 0);

let n = 0;
function card(
  model: Partial<{
    state: State;
    due: Date;
    scheduled_days: number;
    lapses: number;
    difficulty: number;
  }>,
  history: {
    review: Date;
    rating: Rating;
    state: State;
    elapsed_days?: number;
  }[] = []
): Card<NoteType> {
  n++;
  return {
    id: `c${n}`,
    note: `n${n}`,
    deck: "d",
    creationDate: new Date(2026, 0, 1),
    model: {
      state: State.New,
      due: at(0),
      scheduled_days: 0,
      lapses: 0,
      difficulty: 5,
      ...model,
    },
    history: history.map((h) => ({ elapsed_days: 0, scheduled_days: 0, ...h })),
    content: {},
  } as unknown as Card<NoteType>;
}

describe("computeCardStats", () => {
  it("counts today's answers and new cards", () => {
    const cards = [
      card({ state: State.Learning }, [
        { review: at(0, 9), rating: Rating.Again, state: State.New },
        { review: at(0, 10), rating: Rating.Good, state: State.Learning },
      ]),
      card({ state: State.Review, due: at(3) }, [
        { review: at(-5), rating: Rating.Good, state: State.New },
        {
          review: at(0, 11),
          rating: Rating.Good,
          state: State.Review,
          elapsed_days: 5,
        },
      ]),
      card({}),
    ];
    const s = computeCardStats(cards, NOW);
    expect(s.today).toEqual({
      reviewed: 3,
      again: 1,
      correct: 2 / 3,
      newStarted: 1,
    });
    expect(s.history[29]).toBe(3);
    expect(s.history[24]).toBe(1);
    expect(s.totalReviews).toBe(4);
  });

  it("sorts cards into growth stages", () => {
    const s = computeCardStats(
      [
        card({ state: State.New }),
        card({ state: State.Learning }),
        card({ state: State.Review, scheduled_days: 5, due: at(5) }),
        card({ state: State.Review, scheduled_days: 30, due: at(30) }),
        card({ state: State.Review, scheduled_days: 120, due: at(120) }),
      ],
      NOW
    );
    expect(s.stages).toEqual({ 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 });
  });

  it("forecasts due cards, overdue ones today, new cards not at all", () => {
    const s = computeCardStats(
      [
        card({ state: State.Review, due: at(-3) }),
        card({ state: State.Review, due: at(0, 20) }),
        card({ state: State.Review, due: at(1) }),
        card({ state: State.Review, due: at(45) }),
        card({ state: State.New }),
      ],
      NOW
    );
    expect(s.forecast[0]).toBe(2);
    expect(s.forecast[1]).toBe(1);
    expect(s.forecast.reduce((a, b) => a + b)).toBe(3);
  });

  it("works out recall for young and mature review cards", () => {
    const review = (rating: Rating, elapsed: number) => ({
      review: at(-1),
      rating,
      state: State.Review,
      elapsed_days: elapsed,
    });
    const s = computeCardStats(
      [
        card({ state: State.Review, due: at(9) }, [
          review(Rating.Good, 3),
          review(Rating.Again, 4),
          review(Rating.Good, 30),
          review(Rating.Easy, 40),
        ]),
      ],
      NOW
    );
    expect(ratio(s.recall.all)).toBe(3 / 4);
    expect(ratio(s.recall.young)).toBe(1 / 2);
    expect(ratio(s.recall.mature)).toBe(1);
    expect(s.ratings).toEqual({ again: 1, hard: 0, good: 2, easy: 1 });
  });

  it("ranks the hardest cards by lapses, then misses, and flags leeches", () => {
    const miss = { review: at(-2), rating: Rating.Again, state: State.Review };
    const leech = card({ state: State.Review, lapses: 9, due: at(1) }, [miss]);
    const twoMisses = card({ state: State.Review, lapses: 2, due: at(1) }, [
      miss,
      miss,
    ]);
    const oneMiss = card({ state: State.Review, lapses: 2, due: at(1) }, [
      miss,
    ]);
    const easy = card({ state: State.Review, due: at(1) }, [
      { review: at(-2), rating: Rating.Good, state: State.New },
    ]);
    const s = computeCardStats([easy, oneMiss, leech, twoMisses], NOW);
    expect(s.hardest.map((h) => h.card.id)).toEqual([
      leech.id,
      twoMisses.id,
      oneMiss.id,
    ]);
    expect(s.hardest[0].leech).toBe(true);
    expect(s.leeches).toBe(1);
  });

  it("finds the best hour among hours with enough answers", () => {
    const hours = Array.from({ length: 24 }, () => ({
      answers: 0,
      correct: 0,
    }));
    hours[8] = { answers: 10, correct: 7 };
    hours[20] = { answers: 10, correct: 9 };
    hours[23] = { answers: 2, correct: 2 }; // too few to count
    expect(bestHour(hours)).toBe(20);
  });
});
