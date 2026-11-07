import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rankHeadwords } from "./frequency";
import { createLemmatizer } from "./lemma";

describe("rankHeadwords", () => {
  it("groups forms under their headword at the first form's rank", () => {
    const headwordOf = (w: string) =>
      ({ dibeli: "beli", rumahnya: "rumah" })[w] ?? w;
    expect(
      rankHeadwords(["yang", "beli", "rumahnya", "dibeli", "rumah"], headwordOf)
    ).toEqual([
      { rank: 1, headword: "yang", forms: [] },
      { rank: 2, headword: "beli", forms: ["dibeli"] },
      { rank: 3, headword: "rumah", forms: ["rumahnya"] },
    ]);
  });

  it("has at least 10,000 distinct words in the shipped list", () => {
    const data = JSON.parse(
      readFileSync(`${__dirname}/../../public/data/dictionary-id.json`, "utf8")
    );
    const freq = JSON.parse(
      readFileSync(`${__dirname}/../../public/data/frequency-id.json`, "utf8")
    );
    const lex = createLemmatizer(data);
    const ranked = rankHeadwords(freq.words, (w) => lex.lemma(w));
    expect(ranked.length).toBeGreaterThanOrEqual(10000);
    // Single letters, English and short abbreviations are left out.
    const words = new Set(freq.words);
    for (const junk of ["a", "x", "to", "you", "we", "but", "rp", "yg"]) {
      expect(words.has(junk)).toBe(false);
    }
    for (const word of ["si", "para", "api", "cemburu"]) {
      expect(words.has(word)).toBe(true);
    }
    expect(ranked.slice(0, 5).map((r) => r.headword)).toEqual([
      "yang",
      "dan",
      "di",
      "ini",
      "dari",
    ]);
  });
});
