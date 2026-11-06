import { describe, expect, it } from "vitest";
import { dropRepeatedParagraph, sameText } from "./repeatedHint";

describe("repeated hint", () => {
  it("drops a hint that repeats the sentence", () => {
    const html =
      "<p>Alangkah menyedihkannya berita itu.</p><p><em>Alangkah menyedihkannya berita itu.</em></p>";
    expect(dropRepeatedParagraph(html)).toBe(
      "<p>Alangkah menyedihkannya berita itu.</p>"
    );
  });

  it("ignores case, quotes, spacing and end punctuation", () => {
    expect(sameText("Apa kabar?", "<em>apa  kabar</em>")).toBe(true);
    expect(sameText("“Terima kasih.”", "terima kasih")).toBe(true);
  });

  it("keeps a real example sentence", () => {
    const html = "<p>rumah</p><p><em>Rumah saya dekat pasar.</em></p>";
    expect(dropRepeatedParagraph(html)).toBe(html);
  });

  it("leaves single-paragraph and plain content alone", () => {
    expect(dropRepeatedParagraph("<p>makan</p>")).toBe("<p>makan</p>");
    expect(dropRepeatedParagraph("to eat")).toBe("to eat");
    expect(sameText("", "")).toBe(false);
  });
});
