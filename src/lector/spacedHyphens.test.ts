import { describe, expect, it } from "vitest";
import { type Entries, joinSpacedHyphens } from "./spacedHyphens";

const entries: Entries = {
  anak: [["noun", "child"]],
  baik: [["adj", "good"]],
  sama: [["adj", "same"]],
  satu: [["num", "one"]],
  merah: [["adj", "red"]],
  tolong: [["verb", "to help"]],
  pukul: [["verb", "to hit"]],
  tiba: [["verb", "to arrive"]],
  "tiba-tiba": [["adv", "suddenly"]],
  "sayur-mayur": [["noun", "all kinds of vegetable"]],
  aku: [["pron", "I"]],
  dan: [["conj", "and"]],
  roti: [["noun", "bread"]],
  dia: [["pron", "he, she"]],
  ini: [
    ["adv", "now"],
    ["det", "this"],
  ],
  api: [
    ["name", "Api"],
    ["noun", "fire"],
  ],
};
const join = (text: string) => joinSpacedHyphens(text, entries);

describe("joinSpacedHyphens", () => {
  it("joins reduplicated words", () => {
    expect(join("Anak - anak bermain.")).toBe("Anak-anak bermain.");
    expect(join("Kami pergi bersama - sama.")).toBe("Kami pergi bersama-sama.");
    expect(join("Itu satu - satunya jalan.")).toBe("Itu satu-satunya jalan.");
    expect(join("Wajahnya kemerah - merahan.")).toBe(
      "Wajahnya kemerah-merahan."
    );
    expect(join("Mereka saling tolong - menolong.")).toBe(
      "Mereka saling tolong-menolong."
    );
    expect(join("Mereka pukul - memukul.")).toBe("Mereka pukul-memukul.");
    expect(join("Pidatonya berapi - api.")).toBe("Pidatonya berapi-api.");
  });

  it("joins words in the dictionary, and a hyphen spaced on one side", () => {
    expect(join("Dia tiba- tiba pergi.")).toBe("Dia tiba-tiba pergi.");
    expect(join("Ada sayur -mayur di pasar.")).toBe(
      "Ada sayur-mayur di pasar."
    );
    expect(join("Kami baik - baik saja.")).toBe("Kami baik-baik saja.");
  });

  it("leaves dashes and stammers alone", () => {
    expect(join("Dia tidak membeli roti - dia memanggangnya.")).toBe(
      "Dia tidak membeli roti - dia memanggangnya."
    );
    expect(join("Aku - aku tidak tahu.")).toBe("Aku - aku tidak tahu.");
    expect(join("Roti dan - dan susu.")).toBe("Roti dan - dan susu.");
    expect(join("Pak, ini - ini klub swasta.")).toBe(
      "Pak, ini - ini klub swasta."
    );
    // Not in the dictionary.
    expect(join("Hati - hati di jalan.")).toBe("Hati - hati di jalan.");
    expect(join("Jalan Padang - Bukittinggi.")).toBe(
      "Jalan Padang - Bukittinggi."
    );
  });
});
