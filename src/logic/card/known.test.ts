import { Card, FSRS, Rating, State } from "fsrs.js";
import { describe, expect, it } from "vitest";
import { describeDays, knownSchedule } from "./known";

describe("knownSchedule", () => {
  const now = new Date("2026-11-07T12:00:00Z");

  it("sends a new card as far ahead as the maximum interval", () => {
    const fsrs = new FSRS();
    const easy = fsrs.repeat(new Card(), now)[Rating.Easy];
    const known = knownSchedule(easy, now, 36500);
    expect(known.card.state).toBe(State.Review);
    expect(known.card.scheduled_days).toBe(36500);
    expect(known.card.due.getTime() - now.getTime()).toBe(36500 * 86400000);
    expect(known.card.stability).toBeGreaterThanOrEqual(36500);
    expect(known.card.reps).toBe(1);
    expect(known.review_log.rating).toBe(Rating.Easy);
    expect(known.review_log.scheduled_days).toBe(36500);
  });

  it("uses a lower maximum interval, and a later Good stays that far out", () => {
    const fsrs = new FSRS();
    fsrs.p.maximum_interval = 365;
    const easy = fsrs.repeat(new Card(), now)[Rating.Easy];
    const known = knownSchedule(easy, now, 365);
    expect(known.card.scheduled_days).toBe(365);
    const later = new Date(known.card.due);
    const good = fsrs.repeat(known.card as Card, later)[Rating.Good];
    // fsrs.js keeps Good a day past Hard, which is capped at the maximum.
    expect(good.card.scheduled_days).toBeGreaterThanOrEqual(365);
    expect(good.card.scheduled_days).toBeLessThanOrEqual(367);
  });
});

describe("describeDays", () => {
  it("says how long in days, months or years", () => {
    expect(describeDays(1)).toBe("1 day");
    expect(describeDays(45)).toBe("45 days");
    expect(describeDays(365)).toBe("12 months");
    expect(describeDays(1095)).toBe("3 years");
    expect(describeDays(36500)).toBe("100 years");
  });
});
