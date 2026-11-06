import { State } from "fsrs.js";
import { describe, expect, it } from "vitest";
import type { Card } from "./card/card";
import {
  type DailyLimits,
  buildDailyQueue,
  startOfStudyDay,
} from "./dailyQueue";
import type { NoteType } from "./note/note";

const NOW = new Date(2026, 10, 6, 15, 0, 0); // 6 Nov, 3pm
const TODAY = new Date(2026, 10, 6, 9, 0, 0);
const YESTERDAY = new Date(2026, 10, 5, 9, 0, 0);

const ANKI: DailyLimits = {
  newPerDay: 20,
  reviewsPerDay: 200,
  newOrder: "added",
  buryNewSiblings: false,
  buryReviewSiblings: false,
  dayStartHour: 4,
};

let n = 0;
function card(
  state: State,
  opts: {
    note?: string;
    due?: Date;
    history?: { review: Date; state: State }[];
    created?: number;
  } = {}
): Card<NoteType> {
  n++;
  return {
    id: `c${n}`,
    note: opts.note ?? `n${n}`,
    deck: "d",
    creationDate: new Date(2026, 0, 1, 0, 0, opts.created ?? n),
    model: { state, due: opts.due ?? YESTERDAY },
    history: opts.history ?? [],
    content: {},
  } as unknown as Card<NoteType>;
}

const many = (count: number, make: () => Card<NoteType>) =>
  Array.from({ length: count }, make);

describe("buildDailyQueue", () => {
  it("caps new cards and reviews at Anki's defaults", () => {
    const cards = [
      ...many(30, () => card(State.New)),
      ...many(250, () => card(State.Review)),
      ...many(3, () => card(State.Learning)),
    ];
    const q = buildDailyQueue(cards, ANKI, NOW);
    expect(q.newCards).toHaveLength(20);
    expect(q.reviews).toHaveLength(200);
    expect(q.learning).toHaveLength(3);
  });

  it("subtracts what was already studied today", () => {
    const cards = [
      ...many(30, () => card(State.New)),
      // 5 cards first seen today (now learning), 2 seen yesterday.
      ...many(5, () =>
        card(State.Learning, { history: [{ review: TODAY, state: State.New }] })
      ),
      ...many(2, () =>
        card(State.Review, {
          due: new Date(2026, 11, 1),
          history: [{ review: YESTERDAY, state: State.New }],
        })
      ),
      // 50 reviews done today.
      ...many(50, () =>
        card(State.Review, {
          due: new Date(2026, 11, 1),
          history: [
            { review: YESTERDAY, state: State.New },
            { review: TODAY, state: State.Review },
          ],
        })
      ),
      ...many(250, () => card(State.Review)),
    ];
    const q = buildDailyQueue(cards, ANKI, NOW);
    expect(q.newDoneToday).toBe(5);
    expect(q.reviewsDoneToday).toBe(50);
    expect(q.newCards).toHaveLength(15);
    expect(q.reviews).toHaveLength(150);
  });

  it("starts the day at the chosen hour", () => {
    expect(startOfStudyDay(new Date(2026, 10, 6, 3, 0), 4)).toEqual(
      new Date(2026, 10, 5, 4, 0)
    );
    const lateNight = new Date(2026, 10, 6, 2, 0); // counts as 5 Nov
    const cards = [
      ...many(25, () => card(State.New)),
      card(State.Learning, {
        history: [{ review: new Date(2026, 10, 5, 23, 0), state: State.New }],
      }),
    ];
    expect(buildDailyQueue(cards, ANKI, lateNight).newCards).toHaveLength(19);
    expect(buildDailyQueue(cards, ANKI, NOW).newCards).toHaveLength(20);
  });

  it("shows new cards in the order added, or a shuffle that holds all day", () => {
    const cards = [3, 1, 2].map((c) => card(State.New, { created: c }));
    const added = buildDailyQueue(cards, ANKI, NOW).newCards;
    expect(added.map((c) => c.creationDate.getSeconds())).toEqual([1, 2, 3]);
    const random = { ...ANKI, newOrder: "random" as const };
    const a = buildDailyQueue(
      many(20, () => card(State.New)),
      random,
      NOW
    );
    const ids = a.newCards.map((c) => c.id);
    expect(
      buildDailyQueue(a.newCards, random, NOW).newCards.map((c) => c.id)
    ).toEqual(ids);
  });

  it("shows the front → back cards before the reverse ones", () => {
    const pair = (note: string) => {
      const fwd = card(State.New, { note });
      const rev = card(State.New, { note });
      (fwd as unknown as { content: object }).content = { frontIsField1: true };
      (rev as unknown as { content: object }).content = {
        frontIsField1: false,
      };
      return [fwd, rev];
    };
    const cards = [...pair("a"), ...pair("b")];
    const q = buildDailyQueue(cards, ANKI, NOW).newCards;
    expect(q.map((c) => c.note)).toEqual(["a", "b", "a", "b"]);
  });

  it("only takes due reviews, earliest first", () => {
    const later = card(State.Review, { due: new Date(2026, 10, 6, 12) });
    const earlier = card(State.Review, { due: new Date(2026, 10, 1) });
    const notDue = card(State.Review, { due: new Date(2026, 10, 7) });
    const q = buildDailyQueue([later, notDue, earlier], ANKI, NOW);
    expect(q.reviews.map((c) => c.id)).toEqual([earlier.id, later.id]);
  });

  it("buries siblings only when asked", () => {
    const front = card(State.New, { note: "x" });
    const back = card(State.New, { note: "x" });
    const reviewed = card(State.Review, {
      note: "y",
      due: new Date(2026, 11, 1),
      history: [{ review: TODAY, state: State.Review }],
    });
    const sibling = card(State.Review, { note: "y" });
    const cards = [front, back, reviewed, sibling];
    const off = buildDailyQueue(cards, ANKI, NOW);
    expect(off.newCards).toHaveLength(2);
    expect(off.reviews).toHaveLength(1);
    const on = buildDailyQueue(
      cards,
      { ...ANKI, buryNewSiblings: true, buryReviewSiblings: true },
      NOW
    );
    expect(on.newCards.map((c) => c.id)).toEqual([front.id]);
    expect(on.reviews).toHaveLength(0);
  });
});
