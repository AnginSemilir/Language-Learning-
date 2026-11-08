import { describe, expect, it } from "vitest";
import { cardWords } from "./cardWords";

const phrases = new Set(["tanggung jawab", "rumah sakit", "orang tua"]);
const isPhrase = (key: string) => phrases.has(key);

describe("cardWords", () => {
  it("is the word for a one-word card", () => {
    expect(cardWords("Makan", isPhrase)).toEqual(["makan"]);
  });

  it("keeps a fixed phrase whole", () => {
    expect(cardWords("tanggung jawab", isPhrase)).toEqual(["tanggung jawab"]);
  });

  it("splits a sentence into words, compounds staying whole", () => {
    expect(cardWords("Orang tua saya di rumah sakit.", isPhrase)).toEqual([
      "orang tua",
      "saya",
      "di",
      "rumah sakit",
    ]);
  });

  it("splits a phrase the dictionary doesn't have", () => {
    expect(cardWords("makan nasi goreng", isPhrase)).toEqual([
      "makan",
      "nasi",
      "goreng",
    ]);
  });

  it("keeps reduplicated words and leaves out punctuation", () => {
    expect(cardWords("Anak-anak, ayo!", isPhrase)).toEqual([
      "anak-anak",
      "ayo",
    ]);
  });
});
