import { describe, expect, it } from "vitest";
import { duplicateKey, frontHtml } from "./importFlashcards";
import { parseCsv, parseFlashcardCsv } from "./parseCsv";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, commas and newlines in fields", () => {
    const text = 'a,b\r\n"x, y","he said ""hi"""\n"multi\nline",z\n';
    expect(parseCsv(text)).toEqual([
      ["a", "b"],
      ["x, y", 'he said "hi"'],
      ["multi\nline", "z"],
    ]);
  });

  it("strips a BOM and skips blank lines", () => {
    expect(parseCsv("﻿a,b\n\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseFlashcardCsv", () => {
  it("reads front, back and hint by header and ignores other columns", () => {
    const text = [
      "front,back,hint,publishedAt",
      '"gergaji","a saw","Saya menggunakan gergaji untuk memotong kayu.","2025-12-13T14:02:25.661Z"',
      '"gurun Sahara","Sahara Desert","","2025-12-13T12:06:48.244Z"',
      '"","empty front","",""',
    ].join("\n");
    expect(parseFlashcardCsv(text)).toEqual([
      {
        front: "gergaji",
        back: "a saw",
        hint: "Saya menggunakan gergaji untuk memotong kayu.",
      },
      { front: "gurun Sahara", back: "Sahara Desert", hint: "" },
    ]);
  });

  it("falls back to column order without a header", () => {
    expect(parseFlashcardCsv("rumah,house")).toEqual([
      { front: "rumah", back: "house", hint: "" },
    ]);
  });
});

describe("card HTML", () => {
  it("puts the hint under the word and escapes HTML", () => {
    expect(frontHtml({ front: "a<b", back: "", hint: "x & y" })).toBe(
      "<p>a&lt;b</p><p><em>x &amp; y</em></p>"
    );
  });

  it("dedupes on the word, not the example sentence", () => {
    expect(
      duplicateKey(frontHtml({ front: "Gergaji", back: "", hint: "Saya…" }))
    ).toBe("gergaji");
  });
});
