import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { id as pack } from "./languages/id/manifest";
import { createLemmatizer, findNames, isNameToken } from "./lemma";
import { splitWords } from "./reader/utils";

const data = JSON.parse(
  readFileSync(`${__dirname}/../../public/data/dictionary-id.json`, "utf8")
);
const lex = createLemmatizer(data);

describe("lemma (shared progress)", () => {
  it.each([
    ["dibeli", "beli"],
    ["Dibeli", "beli"],
    ["ditulis", "tulis"],
    ["dijual", "jual"],
    ["dimakan", "makan"],
    ["diberikan", "berikan"],
    ["digunakan", "gunakan"],
    ["ditemukan", "temukan"],
    ["dibelinya", "beli"],
    ["rumahnya", "rumah"],
    ["bukunya", "buku"],
    ["buku-buku", "buku"],
  ])("%s → %s", (word, lemma) => {
    expect(lex.lemma(word)).toBe(lemma);
  });

  it("counts meN-, ber-, ter- and -kan forms as their own words", () => {
    for (const w of [
      "membeli",
      "menulis",
      "memberikan",
      "menggunakan",
      "bertanya",
      "berjalan",
      "berjalan-jalan",
      "terlihat",
      "memperbaiki",
    ]) {
      expect(lex.lemma(w)).toBe(w);
    }
  });

  it("does not take every di- word for a passive", () => {
    for (const w of ["dinas", "didik", "dingin", "dinding", "dirinya"]) {
      expect(lex.lemma(w)).not.toBe(w.slice(2));
    }
    expect(lex.lemma("dirinya")).toBe("diri");
  });
});

describe("looseLemma (related words)", () => {
  it.each([
    ["membeli", "beli"],
    ["menulis", "tulis"],
    ["memperbaiki", "baik"],
    ["memberikan", "beri"],
    ["merupakan", "rupa"],
    ["berjalan-jalan", "jalan"],
  ])("%s → %s", (word, root) => {
    expect(lex.looseLemma(word)).toBe(root);
  });

  it("keeps derived nouns as their own headwords", () => {
    expect(lex.lemma("pembelian")).toBe("pembelian");
    expect(lex.lemma("kebaikan")).toBe("kebaikan");
    expect(lex.lemma("makanan")).toBe("makanan");
    expect(lex.derivedFrom("kebaikan")).toBe("baik");
  });

  it("keeps forms whose meaning drifted from the root apart", () => {
    for (const [w, root] of [
      ["merupakan", "rupa"],
      ["terdapat", "dapat"],
      ["berangkat", "angkat"],
      ["termasuk", "masuk"],
      ["meninggalkan", "tinggal"],
      ["belajar", "ajar"],
      ["berdiri", "diri"],
      ["berjalan", "jalan"],
      ["berjalan-jalan", "jalan"],
    ]) {
      expect(lex.lemma(w)).toBe(w);
      expect(lex.looseLemma(w)).toBe(root);
    }
  });

  it("keeps function words that look like verb forms", () => {
    for (const w of ["mereka", "menurut", "melalui", "terhadap"]) {
      expect(lex.lemma(w)).toBe(w);
    }
  });

  it("leaves root words alone", () => {
    for (const w of [
      "makan",
      "bulan",
      "dingin",
      "dinding",
      "gergaji",
      "itu",
      "beli",
      "mandi",
      "menang",
      "dingin",
      "berat",
      "merah",
    ]) {
      expect(lex.lemma(w)).toBe(w);
    }
  });
});

function blocks(text: string) {
  return text.split(/\n\s*\n/).map((b) => splitWords(b, pack));
}

describe("findNames", () => {
  it("treats mid-sentence capitals as names, not sentence starts", () => {
    const names = findNames(
      blocks(
        "Nama aku Sari. Aku tinggal di Jakarta bersama Budi.\n\nKemarin aku pergi ke rumah."
      ),
      lex
    );
    expect(names.has("sari")).toBe(true);
    expect(names.has("jakarta")).toBe(true);
    expect(names.has("budi")).toBe(true);
    expect(names.has("aku")).toBe(false);
    expect(names.has("nama")).toBe(false);
    expect(names.has("kemarin")).toBe(false);
  });

  it("uses the dictionary for words that only start sentences", () => {
    const names = findNames(blocks("Rina pergi. Makan itu enak."), lex);
    expect(names.has("rina")).toBe(true);
    expect(names.has("makan")).toBe(false);
  });

  it("does not treat a word as a name if it also appears in lower case", () => {
    const names = findNames(
      blocks("Ibu Bulan datang. Bulan ini bulan baik."),
      lex
    );
    expect(names.has("bulan")).toBe(false);
  });

  it("flags numbers and acronyms", () => {
    const names = new Set<string>();
    expect(isNameToken("2024", names)).toBe(true);
    expect(isNameToken("DPR", names)).toBe(true);
    expect(isNameToken("rumah", names)).toBe(false);
  });
});
