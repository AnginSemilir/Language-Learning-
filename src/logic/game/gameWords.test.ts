import { describe, expect, it } from "vitest";
import {
  type GameWord,
  MIN_GAME_WORDS,
  TARGET_GAME_WORDS,
  fitsGame,
  pickGameWords,
  sameKey,
  shortGloss,
  shuffled,
} from "./gameWords";

function word(
  id: string,
  stage: GameWord["stage"],
  lastReviewed = 0,
  extra: Partial<GameWord> = {}
): GameWord {
  return {
    id,
    term: id,
    meaning: `meaning of ${id}`,
    fullMeaning: `meaning of ${id}`,
    stage,
    lastReviewed,
    added: 0,
    ...extra,
  };
}

describe("shortGloss", () => {
  it("keeps the first meaning, without notes in brackets", () => {
    expect(shortGloss("to eat; to consume")).toBe("to eat");
    expect(shortGloss("house (building) / home")).toBe("house");
    expect(shortGloss("market.")).toBe("market");
  });

  it("shortens a long meaning at a comma, or with an ellipsis", () => {
    expect(shortGloss("big, large, great in size and importance")).toBe("big");
    const long = shortGloss("a long explanation without any commas at all");
    expect(long.length).toBeLessThanOrEqual(30);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("sameKey", () => {
  it("ignores case, accents and punctuation", () => {
    expect(sameKey("Kafé!")).toBe(sameKey("kafe"));
    expect(sameKey("to  eat")).toBe("to eat");
  });
});

describe("fitsGame", () => {
  it("leaves out sentence cards and empty meanings", () => {
    expect(fitsGame({ term: "makan", meaning: "to eat" })).toBe(true);
    expect(
      fitsGame({ term: "saya mau makan nasi goreng", meaning: "I want" })
    ).toBe(false);
    expect(fitsGame({ term: "makan", meaning: "" })).toBe(false);
  });
});

describe("pickGameWords", () => {
  it("takes the words being learned now, most recently studied first", () => {
    const learning = Array.from({ length: TARGET_GAME_WORDS + 3 }, (_, i) =>
      word(`learning-${i}`, i % 2 === 0 ? 1 : 2, 1000 + i)
    );
    const { words, learningNow } = pickGameWords([
      word("new", 0),
      word("known", 4, 99999),
      ...learning,
    ]);
    expect(learningNow).toBe(learning.length);
    expect(words).toHaveLength(learning.length);
    expect(words[0].id).toBe(`learning-${learning.length - 1}`);
    expect(words.some((w) => w.id === "known" || w.id === "new")).toBe(false);
  });

  it("tops up with new and then known words when few are being learned", () => {
    const { words, learningNow } = pickGameWords([
      word("known", 3, 5),
      word("new", 0),
      word("learning", 1, 10),
    ]);
    expect(learningNow).toBe(1);
    expect(words.map((w) => w.id)).toEqual(["learning", "new", "known"]);
    expect(words.length).toBeLessThan(MIN_GAME_WORDS);
  });

  it("never takes two words that look or mean the same", () => {
    const { words } = pickGameWords([
      word("lihat", 1, 3, { meaning: "to see" }),
      word("melihat", 1, 2, { meaning: "To see!" }),
      word("Lihat", 2, 1, { meaning: "look" }),
      word("makan", 2, 0, { meaning: "to eat" }),
    ]);
    expect(words.map((w) => w.id)).toEqual(["lihat", "makan"]);
  });

  it("uses every word for 'all'", () => {
    const all = [word("a", 0), word("b", 3), word("c", 1)];
    const ids = pickGameWords(all, "all").words.map((w) => w.id);
    expect(ids).toEqual(["c", "a", "b"]);
  });
});

describe("shuffled", () => {
  it("keeps every item and leaves the original alone", () => {
    const items = [1, 2, 3, 4, 5];
    const result = shuffled(items, () => 0);
    expect([...result].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });
});
