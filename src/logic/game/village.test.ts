import { describe, expect, it } from "vitest";
import type { IslandDay } from "./discoveries";
import { type VillageInput, villageNews } from "./village";

const day: IslandDay = {
  date: "2026-11-07",
  season: "hujan",
  weather: "hujan",
  mist: false,
  events: [],
  visitors: ["paus"],
  bottle: null,
  celebration: null,
  studied: true,
};

const input: VillageInput = {
  day,
  phase: "day",
  villagers: 3,
  studied: true,
  streak: 5,
  questsLeft: 1,
  next: undefined,
  trees: 120,
  knownWords: 40,
  storyStep: "lampu",
};

describe("village news", () => {
  it("leads with gossip about the secret, then you, then visitors", () => {
    const news = villageNews(input);
    expect(news).toHaveLength(3);
    expect(news[0].text).toContain("lampu biru");
    expect(news[1].text).toContain("5 hari berturut-turut");
    for (const line of news) {
      expect(["Ani", "Budi", "Citra"]).toContain(line.who);
      expect(line.text).not.toContain("${");
      expect(line.en.length).toBeGreaterThan(5);
    }
  });

  it("nudges you to study when the campfire is going out", () => {
    const news = villageNews({ ...input, studied: false, storyStep: null });
    expect(news[0].text).toContain("Api unggun hampir padam");
    expect(news[1].text).toContain("paus");
  });

  it("is the same all day long", () => {
    expect(villageNews(input)).toEqual(villageNews(input));
  });
});
