import { describe, expect, it } from "vitest";
import { glossWords, hasMeaning } from "./meaningCheck";

describe("hasMeaning", () => {
  it("finds a gloss word, allowing for endings", () => {
    const meja = ["table"];
    expect(hasMeaning("The books are on the tables.", meja)).toBe(true);
    expect(hasMeaning("The books are on the desk.", meja)).toBe(false);
  });

  it("knows irregular forms", () => {
    const beli = ["to buy (to obtain for money)"];
    expect(hasMeaning("She bought a new car.", beli)).toBe(true);
    expect(hasMeaning("She obtained a new car.", beli)).toBe(true);
    expect(hasMeaning("She has a new car.", beli)).toBe(false);
  });

  it("only matches the start of a word", () => {
    // "eat" must not match "great" or "seat".
    expect(hasMeaning("It was a great seat.", ["to eat"])).toBe(false);
    expect(hasMeaning("We ate rice.", ["to eat"])).toBe(true);
  });

  it("ignores grammar words and labels in glosses", () => {
    expect(glossWords("(transitive) to buy, to obtain")).toEqual([
      "buy",
      "obtain",
    ]);
    expect(hasMeaning("He went to the shop.", ["(transitive) to buy"])).toBe(
      false
    );
  });

  it("uses only the first four senses", () => {
    const glosses = ["one", "two", "three", "four", "hospital"];
    expect(hasMeaning("He is in hospital.", glosses)).toBe(false);
  });
});
