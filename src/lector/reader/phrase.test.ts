import { describe, expect, it } from "vitest";
import { id as pack } from "../languages/id/manifest";
import {
  blockWords,
  domParts,
  grow,
  joins,
  phraseAround,
  phraseInSet,
  phraseRuns,
  phraseText,
  selectedPhrase,
  withoutClitic,
} from "./phrase";
import { splitWords } from "./utils";

const block = (text: string) => blockWords(splitWords(text, pack));

describe("blockWords", () => {
  it("keeps each word and the text between it and the next", () => {
    const b = block("Mereka pergi bulan madu. Ke Bali!");
    expect(b.words).toEqual(["Mereka", "pergi", "bulan", "madu", "Ke", "Bali"]);
    expect(b.gaps).toEqual([" ", " ", " ", ". ", " "]);
  });
});

describe("joins", () => {
  it("runs across spaces and commas but not a sentence end or a line break", () => {
    expect(joins(" ")).toBe(true);
    expect(joins(", ")).toBe(true);
    expect(joins(". ")).toBe(false);
    expect(joins("? ")).toBe(false);
    expect(joins("\n")).toBe(false);
    expect(joins(" — ")).toBe(false);
    expect(joins(" (")).toBe(false);
  });
});

describe("phraseText", () => {
  it("joins the words as written, with single spaces", () => {
    const b = block("pergi  bulan   madu, lalu");
    expect(phraseText(b, { from: 1, to: 2 })).toBe("bulan madu");
    expect(phraseText(b, { from: 0, to: 3 })).toBe("pergi bulan madu, lalu");
    expect(phraseText(b, { from: 2, to: 2 })).toBe("madu");
  });
});

describe("grow", () => {
  const b = block("Mereka pergi bulan madu. Ke Bali");
  it("adds the word before or after", () => {
    expect(grow(b, { from: 2, to: 2 }, "after")).toEqual({ from: 2, to: 3 });
    expect(grow(b, { from: 2, to: 3 }, "before")).toEqual({ from: 1, to: 3 });
  });
  it("stops at a sentence end and the block's edges", () => {
    expect(grow(b, { from: 2, to: 3 }, "after")).toBeNull();
    expect(grow(b, { from: 4, to: 4 }, "before")).toBeNull();
    expect(grow(b, { from: 0, to: 1 }, "before")).toBeNull();
    expect(grow(b, { from: 5, to: 5 }, "after")).toBeNull();
  });
});

describe("phraseAround", () => {
  const known = new Set(["bulan madu", "rumah sakit", "rumah sakit jiwa"]);
  const has = (key: string) => known.has(key);

  it("finds a phrase the word starts or ends", () => {
    const b = block("Mereka pergi Bulan Madu ke Bali.");
    expect(phraseAround(b, 2, has, 4)).toEqual({ from: 2, to: 3 });
    expect(phraseAround(b, 3, has, 4)).toEqual({ from: 2, to: 3 });
    expect(phraseAround(b, 1, has, 4)).toBeNull();
  });

  it("prefers the longest phrase", () => {
    const b = block("Dia di rumah sakit jiwa sekarang");
    expect(phraseAround(b, 3, has, 4)).toEqual({ from: 2, to: 4 });
  });

  it("doesn't join words across a sentence end", () => {
    const b = block("Itu bulan. Madu itu manis.");
    expect(phraseAround(b, 1, has, 4)).toBeNull();
  });
});

describe("phraseRuns", () => {
  it("marks every phrase in the block by its first word", () => {
    const has = (key: string) => key === "bulan madu" || key === "orang tua";
    const b = block("Bulan madu orang tua saya. Bulan madu itu");
    expect(phraseRuns(b, has, 2)).toEqual([0, 0, 2, 2, -1, 5, 5, -1]);
  });
});

describe("selectedPhrase", () => {
  function render(html: string) {
    document.body.innerHTML = html;
    return document.body;
  }
  const word = (text: string) =>
    `<span data-leaf="" class="word-cell word-cell--new">${text}</span>`;
  const gap = (text: string) => `<span data-leaf="">${text}</span>`;

  it("reads the words a selection touches, whole", () => {
    const body = render(
      `<p data-block-id="12">${word("Mereka")}${gap(" ")}<strong>${word(
        "bulan"
      )}</strong>${gap(" ")}${word("madu")}${gap(".")}<br>${word("Lalu")}</p>`
    );
    const cells = body.querySelectorAll(".word-cell");
    const range = document.createRange();
    // From the middle of "bulan" to the middle of "madu".
    range.setStart(cells[1].firstChild as Text, 2);
    range.setEnd(cells[2].firstChild as Text, 2);
    const picked = selectedPhrase(range);
    expect(picked?.blockId).toBe(12);
    expect(picked?.range).toEqual({ from: 1, to: 2 });
    expect(picked?.first).toBe(cells[1]);
    const b = blockWords(picked?.parts ?? []);
    expect(b.words).toEqual(["Mereka", "bulan", "madu", "Lalu"]);
    expect(b.gaps).toEqual([" ", " ", ".\n"]);
  });

  it("ignores a selection inside one word or across blocks", () => {
    const body = render(
      `<p data-block-id="1">${word("bulan")}${gap(" ")}${word("madu")}</p><p data-block-id="9">${word("lagi")}</p>`
    );
    const cells = body.querySelectorAll(".word-cell");
    const inWord = document.createRange();
    inWord.setStart(cells[0].firstChild as Text, 0);
    inWord.setEnd(cells[0].firstChild as Text, 3);
    expect(selectedPhrase(inWord)).toBeNull();
    const across = document.createRange();
    across.setStart(cells[1].firstChild as Text, 0);
    across.setEnd(cells[2].firstChild as Text, 2);
    expect(selectedPhrase(across)).toBeNull();
    expect(domParts(body.querySelector("p") as Element)).toEqual([
      { text: "bulan", isWord: true },
      { text: " ", isWord: false },
      { text: "madu", isWord: true },
    ]);
  });
});

describe("phraseInSet", () => {
  it("finds the phrase, or the phrase without a clitic", () => {
    const keys = new Set(["bulan madu"]);
    expect(phraseInSet(keys, "bulan madu")).toBe("bulan madu");
    expect(phraseInSet(keys, "bulan madunya")).toBe("bulan madu");
    expect(phraseInSet(keys, "bulan madulah")).toBe("bulan madu");
    expect(phraseInSet(keys, "bulan")).toBeUndefined();
    expect(phraseInSet(new Set(["orang"]), "orang ku")).toBeUndefined();
  });
});

describe("withoutClitic", () => {
  const forms: Record<string, string> = {
    besinya: "besi",
    madunya: "madu",
    bukuku: "buku",
  };
  const isForm = (word: string, stem: string) =>
    forms[word.toLowerCase()] === stem.toLowerCase();

  it("drops the ending of the last word when it's a form of the stem", () => {
    expect(withoutClitic("pelat besinya", isForm)).toBe("pelat besi");
    expect(withoutClitic("bulan madunya", isForm)).toBe("bulan madu");
    expect(withoutClitic("Buku bukuku", isForm)).toBe("Buku buku");
  });

  it("leaves words that only end like a clitic", () => {
    // "tanya" isn't "ta" + nya; "dahulu" doesn't end in a clitic.
    expect(withoutClitic("bertanya", isForm)).toBeUndefined();
    expect(withoutClitic("dahulu kala", isForm)).toBeUndefined();
    expect(withoutClitic("pelat besi", isForm)).toBeUndefined();
  });
});
