import { emptyDailyStats } from "@/lector/lib/dailyStats";
import { addDaysToDateString } from "@/lector/lib/dates";
import type { DailyStats } from "@/lector/types";
import { describe, expect, it } from "vitest";
import { celebrationOn, eventsFor, seasonOf, weatherFor } from "./calendar";
import {
  ANIMALS,
  COLLECTION,
  PROVERBS,
  VISITORS,
  discover,
  levelDiscovery,
} from "./discoveries";
import { chance, replay } from "./journey";
import { xpForLevel } from "./progress";

const START = "2026-01-01";

/** `days` study days in a row from START, `reviews` answers on each. */
function history(days: number, reviews = 30, extra: Partial<DailyStats> = {}) {
  return Array.from({ length: days }, (_, i) => ({
    ...emptyDailyStats(addDaysToDateString(START, i)),
    ankiReviews: reviews,
    ...extra,
  }));
}

const island = {
  forest: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 },
  knownWords: 0,
};

describe("chance", () => {
  it("is the same for the same seed and spread over [0, 1)", () => {
    expect(chance("2026-11-07|paus")).toBe(chance("2026-11-07|paus"));
    const rolls = Array.from({ length: 2000 }, (_, i) => chance(`seed-${i}`));
    const low = rolls.filter((r) => r < 0.1).length;
    expect(Math.min(...rolls)).toBeGreaterThan(-0.000001);
    expect(Math.max(...rolls)).toBeLessThan(1);
    expect(low).toBeGreaterThan(140);
    expect(low).toBeLessThan(260);
  });
});

describe("replay", () => {
  it("keeps running totals, the level and the streak, day by day", () => {
    const days = [
      { ...emptyDailyStats("2026-03-01"), ankiReviews: 50 },
      { ...emptyDailyStats("2026-03-02"), ankiReviews: 50 },
      { ...emptyDailyStats("2026-03-04"), clozePracticed: 10 },
    ];
    const journey = replay(days);
    expect(journey.map((d) => d.streak)).toEqual([1, 2, 1]);
    expect(journey.map((d) => d.longestStreak)).toEqual([1, 2, 2]);
    expect(journey[2].totals.reviews).toBe(100);
    expect(journey[2].totals.cloze).toBe(10);
    expect(journey[2].totals.activeDays).toBe(3);
    expect(journey[1].xp).toBe(200);
    expect(journey[1].level).toBe(2);
  });

  it("breaks the streak on a day with nothing done", () => {
    const days = [
      { ...emptyDailyStats("2026-03-01"), ankiReviews: 5 },
      emptyDailyStats("2026-03-02"),
      { ...emptyDailyStats("2026-03-03"), ankiReviews: 5 },
    ];
    expect(replay(days).map((d) => d.streak)).toEqual([1, 0, 1]);
  });
});

describe("weather and the calendar", () => {
  it("knows the seasons", () => {
    expect(seasonOf("2026-01-15")).toBe("hujan");
    expect(seasonOf("2026-07-15")).toBe("kemarau");
    expect(seasonOf("2026-04-15")).toBe("pancaroba");
  });

  it("rains more in the rainy season", () => {
    const rainy = (month: string) => {
      let count = 0;
      for (let year = 2020; year < 2032; year++) {
        for (let day = 1; day <= 28; day++) {
          const date = `${year}-${month}-${String(day).padStart(2, "0")}`;
          const weather = weatherFor(date);
          if (weather === "hujan" || weather === "badai") count++;
        }
      }
      return count;
    };
    expect(rainy("01")).toBeGreaterThan(rainy("07") * 2);
  });

  it("has a night market on Saturdays once there's a market", () => {
    expect(eventsFor("2026-11-07", 8)).toContain("pasar-malam");
    expect(eventsFor("2026-11-07", 7)).not.toContain("pasar-malam");
    expect(eventsFor("2026-11-08", 8)).not.toContain("pasar-malam");
  });

  it("celebrates holidays, the island's birthday and the 100th day", () => {
    expect(celebrationOn("2026-08-17", "2025-03-01", 10)).toBe("kemerdekaan");
    expect(celebrationOn("2027-03-01", "2026-03-01", 10)).toBe("ulang-tahun");
    expect(celebrationOn("2026-03-01", "2026-03-01", 1)).toBeUndefined();
    expect(celebrationOn("2026-05-05", "2026-03-01", 100)).toBe("seratus-hari");
  });
});

describe("discover", () => {
  it("finds every level reached, on the day it was reached", () => {
    const journey = replay(history(10, 60));
    const { found } = discover({ journey, today: "2026-01-10", island });
    const levels = found.filter((f) => f.kind === "level");
    const last = journey[journey.length - 1];
    expect(levels.map((f) => f.id)).toEqual(
      Array.from({ length: last.level - 1 }, (_, i) => `level-${i + 2}`)
    );
    expect(levels[0].date).toBe(START);
    expect(found.some((f) => f.id === "rahasia")).toBe(true);
  });

  it("meets animals at their milestones", () => {
    const journey = replay(history(3, 10));
    const { found } = discover({ journey, today: "2026-01-03", island });
    const animals = found.filter((f) => f.kind === "animal");
    expect(animals.map((a) => [a.id, a.date])).toEqual([
      ["ayam", "2026-01-01"],
      ["kucing", "2026-01-03"],
    ]);
  });

  it("knows animals that depend on the forest now, without a date", () => {
    const grown = { ...island, forest: { 0: 0, 1: 0, 2: 20, 3: 10, 4: 30 } };
    const journey = replay(history(1, 5));
    const { found } = discover({ journey, today: START, island: grown });
    const names = found.map((f) => [f.id, f.date]);
    expect(names).toContainEqual(["monyet", null]);
    expect(names).toContainEqual(["orangutan", null]);
  });

  it("finds visitors and bottles only on study days", () => {
    const studied = replay(history(200, 120));
    const { found } = discover({ journey: studied, today: START, island });
    const visitors = found.filter((f) => f.kind === "visitor");
    const proverbs = found.filter((f) => f.kind === "proverb");
    expect(visitors.length).toBeGreaterThan(2);
    expect(proverbs.length).toBeGreaterThan(10);
    // Proverbs come in order, none twice.
    expect(proverbs.map((p) => p.id)).toEqual(
      PROVERBS.slice(0, proverbs.length).map((p) => `peribahasa-${p.id}`)
    );
    const idle = replay(history(200, 0));
    const none = discover({ journey: idle, today: START, island }).found;
    expect(none.filter((f) => f.kind === "visitor")).toEqual([]);
  });

  it("describes today: weather, visitors, a bottle, whether it counts", () => {
    const journey = replay(history(5, 30));
    const today = "2026-01-05";
    const { day } = discover({ journey, today, island });
    expect(day.date).toBe(today);
    expect(day.studied).toBe(true);
    expect(day.weather).toBe(weatherFor(today));
    const tomorrow = discover({ journey, today: "2026-01-06", island }).day;
    expect(tomorrow.studied).toBe(false);
  });

  it("celebrates the 100th study day", () => {
    const journey = replay(history(100, 10));
    const { found } = discover({ journey, today: "2026-04-10", island });
    const party = found.find((f) => f.id === "seratus-hari");
    expect(party?.date).toBe(addDaysToDateString(START, 99));
  });
});

describe("content", () => {
  it("has a unique id for everything that can be found", () => {
    const ids = COLLECTION.flatMap((c) => c.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ANIMALS.length).toBeGreaterThan(8);
    expect(VISITORS.length).toBeGreaterThan(5);
  });

  it("has a postcard or a building for every level", () => {
    for (let level = 2; level <= 40; level++) {
      const d = levelDiscovery(level);
      expect(d.line.length).toBeGreaterThan(5);
      expect(d.lineEn.length).toBeGreaterThan(5);
    }
    expect(levelDiscovery(9).word).toBe("pulau seberang");
    expect(xpForLevel(9)).toBe(3600);
  });
});
