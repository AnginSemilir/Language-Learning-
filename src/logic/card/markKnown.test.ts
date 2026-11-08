import { FSRS, Card as Model, Rating, State } from "fsrs.js";
import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ db: {} }));
vi.mock("../deck/deckStatsCacheManager", () => ({
  invalidateDeckStatsCache: async () => {},
}));

import type { NoteType } from "../note/note";
import type { Card } from "./card";
import { knownRange } from "./known";
import { knownUpdates } from "./markKnown";

const now = new Date("2026-11-08T09:00:00Z");
const DAY = 86400000;

function card(id: string, model = new Model()) {
  return {
    id,
    deck: "d",
    note: id,
    history: [],
    model,
    content: {},
  } as unknown as Card<NoteType>;
}

/** A card answered Good until it is due `days` from now. */
function reviewing(id: string, days: number) {
  const model = new Model();
  Object.assign(model, {
    state: State.Review,
    stability: days,
    difficulty: 5,
    scheduled_days: days,
    due: new Date(now.getTime() + days * DAY),
    last_review: now,
    reps: 3,
  });
  return card(id, model);
}

describe("knownUpdates", () => {
  const scheduler = new FSRS();
  const range = knownRange(30, 180, 36500);

  it("spreads a batch of new cards over the range, one to six months out", () => {
    const cards = Array.from({ length: 600 }, (_, i) => card(`c${i}`));
    const updates = knownUpdates(cards, scheduler, range, now);
    expect(updates).toHaveLength(600);
    const days = updates.map(
      (u) => (u.model.due.getTime() - now.getTime()) / DAY
    );
    expect(Math.min(...days)).toBeGreaterThanOrEqual(30);
    expect(Math.max(...days)).toBeLessThanOrEqual(180);
    // Spread out: no single day takes more than a few of them.
    const perDay = new Map<number, number>();
    for (const d of days) perDay.set(d, (perDay.get(d) ?? 0) + 1);
    expect(Math.max(...perDay.values())).toBeLessThan(15);
    for (const u of updates) {
      expect(u.model.state).toBe(State.Review);
      expect(u.model.stability).toBeGreaterThanOrEqual(u.model.scheduled_days);
    }
  });

  it("leaves a card that's already due further out", () => {
    const far = reviewing("far", 400);
    const near = reviewing("near", 3);
    const updates = knownUpdates([far, near], scheduler, range, now, () => 0.5);
    expect(updates.map((u) => u.id)).toEqual(["near"]);
  });

  it("comes back as an ordinary review, a Good sending it further out", () => {
    const [update] = knownUpdates([card("a")], scheduler, range, now, () => 0);
    expect(update.model.scheduled_days).toBe(30);
    const later = new Date(update.model.due);
    const good = scheduler.repeat(update.model as Model, later)[Rating.Good];
    expect(good.card.scheduled_days).toBeGreaterThan(30);
  });
});

describe("knownRange", () => {
  it("keeps the settings sensible", () => {
    expect(knownRange(30, 180, 36500)).toEqual({ min: 30, max: 180 });
    expect(knownRange(200, 50, 36500)).toEqual({ min: 50, max: 200 });
    expect(knownRange(30, 180, 90)).toEqual({ min: 30, max: 90 });
    expect(knownRange("", undefined, 36500)).toEqual({ min: 30, max: 180 });
  });
});
