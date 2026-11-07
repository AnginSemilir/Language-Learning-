import { describe, expect, it } from "vitest";
import {
  STORY,
  checkAnswer,
  parseStory,
  riddleHint,
  storyState,
  storyValue,
  tapAdvances,
} from "./story";

const step = (id: string) => {
  const found = STORY.find((s) => s.id === id);
  if (!found) throw new Error(id);
  return found;
};

describe("the island's secret", () => {
  it("waits for level 2, then starts by itself", () => {
    expect(storyState(new Set(), 1).done).toEqual([]);
    expect(storyState(new Set(), 1).ready).toBe(false);
    const started = storyState(new Set(), 2);
    expect(started.done.map((s) => s.id)).toEqual(["jejak"]);
    expect(started.next?.id).toBe("abu");
    expect(started.ready).toBe(true);
  });

  it("moves on by tapping the right thing at the right time", () => {
    const story = storyState(new Set(["abu", "peta"]), 6);
    expect(story.next?.id).toBe("asing");
    expect(tapAdvances(story, "warung", "day")).toBe(true);
    expect(tapAdvances(story, "dermaga", "day")).toBe(false);
    const later = storyState(new Set(["abu", "peta", "asing"]), 6);
    expect(tapAdvances(later, "dermaga", "day")).toBe(false);
    expect(tapAdvances(later, "dermaga", "night")).toBe(true);
    expect(later.stranger).toBe(true);
  });

  it("waits for the level of the next step", () => {
    const story = storyState(new Set(["abu", "peta"]), 4);
    expect(story.next?.id).toBe("asing");
    expect(story.ready).toBe(false);
    expect(tapAdvances(story, "warung", "day")).toBe(false);
  });

  it("counts map pieces and opens the cave", () => {
    const all = new Set(STORY.map((s) => s.id));
    const done = storyState(all, 30);
    expect(done.finished).toBe(true);
    expect(done.mapPieces).toBe(4);
    expect(done.treasure).toBe(true);
    expect(done.stranger).toBe(false);
    expect(storyState(new Set(["abu", "peta"]), 3).mapPieces).toBe(1);
  });

  it("checks riddle answers in Indonesian, kindly", () => {
    const peta = step("peta");
    expect(checkAnswer(peta, "peta")).toBe("right");
    expect(checkAnswer(peta, "  Sebuah PETA! ")).toBe("right");
    expect(checkAnswer(peta, "a map")).toBe("english");
    expect(checkAnswer(peta, "pantai")).toBe("wrong");
    expect(riddleHint(peta, 0)).toBeNull();
    expect(riddleHint(peta, 1)).toBe("Huruf pertama: P");
    expect(riddleHint(peta, 2)).toBe("4 huruf: P _ _ _");
    expect(riddleHint(peta, 3)).toContain("map");
  });

  it("stores the steps done as a list", () => {
    const done = parseStory("abu,peta");
    expect([...done]).toEqual(["abu", "peta"]);
    expect(storyValue(done)).toBe("abu,peta");
    expect(parseStory(undefined).size).toBe(0);
    expect(parseStory("").size).toBe(0);
  });

  it("has a riddle for every riddle step and a clue for the others", () => {
    for (const s of STORY) {
      if (s.trigger.kind === "riddle") expect(s.riddle).toBeDefined();
      if (s.trigger.kind !== "auto") expect(s.clue.length).toBeGreaterThan(5);
    }
  });
});
