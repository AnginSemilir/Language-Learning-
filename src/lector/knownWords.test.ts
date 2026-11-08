import { describe, expect, it, vi } from "vitest";

vi.mock("@/logic/db", () => ({ db: {} }));

import { cardWordLevels, higher } from "./knownWords";
import type { GrammarData, Lemmatizer } from "./lemma";

const grammar = {
  data: {
    e: { "tanggung jawab": [] },
    i: {},
    v: {},
    n: {},
    p: {},
  } as unknown as GrammarData,
  lex: {
    lemma: (w: string) => (w === "membeli" ? "beli" : w),
  } as unknown as Lemmatizer,
};

describe("cardWordLevels", () => {
  it("counts each word of a card, by headword, compounds whole", () => {
    const cards = new Map([
      ["membeli", { status: "familiar" as const, back: "to buy" }],
      ["saya membeli tanggung jawab", { status: "known" as const, back: "x" }],
      ["rumah", { status: undefined, back: "house" }],
    ]);
    const levels = cardWordLevels(cards, grammar);
    expect([...levels.keys()].sort()).toEqual([
      "beli",
      "saya",
      "tanggung jawab",
    ]);
    // The stronger level wins: known from the sentence card.
    expect(levels.get("beli")).toEqual({
      level: "known",
      translation: "to buy",
    });
    expect(levels.get("tanggung jawab")?.translation).toBe("");
  });
});

describe("higher", () => {
  it("picks the further along", () => {
    expect(higher("familiar", "known")).toBe("known");
    expect(higher("familiar", undefined)).toBe("familiar");
    expect(higher(undefined, undefined)).toBeUndefined();
  });
});
