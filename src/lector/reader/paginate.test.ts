import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { id as pack } from "../languages/id/manifest";
import { countTypedWords } from "../languages/tokenizer";
import { paginate } from "./paginate";

const count = (s: string) => countTypedWords(s, pack);

describe("paginate", () => {
  it("keeps short texts on one page", () => {
    expect(paginate("Aku makan nasi.\n\nKamu minum teh.")).toEqual([
      "Aku makan nasi.\n\nKamu minum teh.",
    ]);
  });

  it("splits a lesson into pages near the target without losing words", () => {
    const text = readFileSync(
      `${__dirname}/../content/starter/01-aku-sari.md`,
      "utf8"
    ).replace(/^# .*\n+/, "");
    const pages = paginate(text, 90);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.map(count).reduce((a, b) => a + b, 0)).toBe(count(text));
    for (const page of pages) expect(count(page)).toBeLessThanOrEqual(130);
  });

  it("splits a long paragraph at sentence boundaries", () => {
    const paragraph = Array.from(
      { length: 40 },
      (_, i) => `Kalimat nomor ${i} ada di sini.`
    ).join(" ");
    const pages = paginate(paragraph, 50);
    expect(pages.length).toBeGreaterThan(3);
    for (const page of pages) expect(page.trim().endsWith(".")).toBe(true);
  });

  it("returns one empty page for empty content", () => {
    expect(paginate("")).toEqual([""]);
  });
});
