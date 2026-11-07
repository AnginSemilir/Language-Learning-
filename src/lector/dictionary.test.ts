import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveWord } from "./dictionary";
import { createLemmatizer } from "./lemma";

const data = JSON.parse(
  readFileSync(`${__dirname}/../../public/data/dictionary-id.json`, "utf8")
);

describe("resolveWord (Indonesian)", () => {
  it("finds exact entries case-insensitively", () => {
    const e = resolveWord(data, "Gergaji");
    expect(e?.word).toBe("gergaji");
    expect(e?.senses[0].gloss).toMatch(/saw/);
    expect(e?.lemmaInfo).toBeUndefined();
  });

  it("follows the inflection table", () => {
    const e = resolveWord(data, "meneken");
    expect(e?.word).toBe("teken");
    expect(e?.lemmaInfo?.label).toBe("active form of");
  });

  it("peels clitics such as -nya", () => {
    const e = resolveWord(data, "rumahnya");
    expect(e?.word).toBe("rumah");
    expect(e?.lemmaInfo?.label).toBe("nya form of");
  });

  it("shows the meanings of the word an entry points to", () => {
    // Wiktionary has "melihat: active of lihat" and "tapi: alternative form of tetapi".
    const melihat = resolveWord(data, "melihat");
    expect(melihat?.word).toBe("lihat");
    expect(melihat?.lemmaInfo).toEqual({ label: "active of", stem: "lihat" });
    expect(melihat?.senses[0].gloss).toMatch(/see/);
    const tapi = resolveWord(data, "Tapi");
    expect(tapi?.lemmaInfo?.stem).toBe("tetapi");
    expect(tapi?.senses.some((s) => /\bbut\b/.test(s.gloss))).toBe(true);
    // After a clitic too: melihatnya → melihat → lihat.
    expect(resolveWord(data, "melihatnya")?.word).toBe("lihat");
  });

  it("finds words Wiktionary lacks in the other sources", () => {
    const cemburu = resolveWord(data, "cemburu");
    expect(cemburu?.senses[0]).toMatchObject({
      gloss: "jealous",
      source: "malay",
    });
    const butuh = resolveWord(data, "membutuhkanmu");
    expect(butuh?.word).toBe("membutuhkan");
    expect(butuh?.lemmaInfo?.label).toBe("mu form of");
    expect(butuh?.senses[0]).toMatchObject({ source: "wordnet" });
    expect(butuh?.senses[0].gloss).toMatch(/need/);
    expect(resolveWord(data, "sih")?.senses[0].source).toBe("spoken");
  });

  it("falls back on the root, marked as a guess", () => {
    const lex = createLemmatizer(data);
    const e = resolveWord(data, "kutemukan", lex);
    expect(e?.guess).toBe(true);
    expect(e?.lemmaInfo?.stem).toBe("temu");
    expect(resolveWord(data, "kutemukan")).toBeUndefined();
  });

  it("returns undefined for nonsense", () => {
    expect(resolveWord(data, "qzxqzx")).toBeUndefined();
  });
});
