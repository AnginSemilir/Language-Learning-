import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  type CardWord,
  cardTerm,
  findSpan,
  pickSentence,
  termKey,
} from "./cardCloze";
import { createLemmatizer } from "./lemma";
import { createBlankedSentence } from "./practice/utils";
import {
  POOL_VERSION,
  type PoolShard,
  sentenceKey,
  shardFile,
  shardOf,
} from "./sentencePool";

vi.mock("@/logic/db", () => ({ db: {} }));

const root = `${__dirname}/../../public/data`;
const lex = createLemmatizer(
  JSON.parse(readFileSync(`${root}/dictionary-id.json`, "utf8"))
);
const poolDir = `${root}/sentences/v${POOL_VERSION}`;
const shard = (key: string): PoolShard =>
  JSON.parse(readFileSync(`${poolDir}/${shardFile(shardOf(key))}`, "utf8"));

function word(term: string, extra: Partial<CardWord> = {}): CardWord {
  return {
    key: termKey(term, lex) ?? term,
    term,
    meaning: "meaning",
    example: "",
    studied: true,
    ...extra,
  };
}

const candidate = (text: string, translation = "") => ({
  id: sentenceKey(text),
  text,
  translation,
  source: "tatoeba" as const,
  sourceName: "Tatoeba",
});

describe("cardTerm / termKey", () => {
  it.each([
    ["makan", "makan"],
    ["Makan (v)", "makan"],
    ["kamu / anda", "kamu"],
    ["Apa kabar?", "apa kabar"],
    ["dibeli", "beli"],
    ["rumahnya", "rumah"],
    ["membeli", "membeli"],
    ["terima kasih", "terima kasih"],
  ])("%s → %s", (front, key) => {
    expect(termKey(cardTerm(front), lex)).toBe(key);
  });

  it("leaves out sentence cards", () => {
    expect(termKey("Saya tidak tahu apa yang harus dilakukan", lex)).toBe(null);
  });
});

describe("findSpan", () => {
  it("finds a form sharing the headword", () => {
    const text = "Nasi itu sudah dimakan.";
    const span = findSpan(text, "makan", lex);
    expect(span && text.slice(span.start, span.end)).toBe("dimakan");
  });

  it("finds a phrase", () => {
    const text = "Tidak, terima kasih.";
    const span = findSpan(text, "terima kasih", lex);
    expect(span && text.slice(span.start, span.end)).toBe("terima kasih");
  });

  it("does not match a different word with the same root", () => {
    expect(findSpan("Dia membeli buku.", "beli", lex)).toBe(null);
  });

  it("blanks the span with the three-piece tokens", () => {
    const text = "Kami makan nasi.";
    const span = findSpan(text, "makan", lex);
    if (!span) throw new Error("no span");
    const tokens = [
      text.slice(0, span.start),
      text.slice(span.start, span.end),
      text.slice(span.end),
    ];
    expect(createBlankedSentence(text, 1, tokens)).toBe("Kami _____ nasi.");
  });
});

describe("pickSentence", () => {
  const makan = word("makan");
  const a = candidate("Aku sudah makan.", "I've eaten.");
  const b = candidate("Kami makan nasi goreng di warung.");

  it("prefers the translated, easier sentence", () => {
    const pick = pickSentence(makan, [b, a], undefined, new Set(), lex);
    expect(pick?.sentence).toBe(a.text);
    expect(pick?.clozeWord).toBe("makan");
    expect(pick?.vocabEntryId).toBe("makan");
  });

  it("skips sentences shown recently and hidden ones", () => {
    const row = {
      id: "makan",
      masteryLevel: 25 as const,
      nextReview: new Date(),
      reviewCount: 1,
      timesCorrect: 1,
      timesIncorrect: 0,
      recent: [a.id],
      hidden: [],
    };
    expect(pickSentence(makan, [a, b], row, new Set(), lex)?.sentence).toBe(
      b.text
    );
    expect(
      pickSentence(
        makan,
        [a, b],
        { ...row, recent: [], hidden: [a.id] },
        new Set(),
        lex
      )?.sentence
    ).toBe(b.text);
  });

  it("shows the card's own example first", () => {
    const own = {
      ...candidate("Kami makan bersama."),
      source: "card" as const,
    };
    expect(
      pickSentence(makan, [a, b, own], undefined, new Set(), lex)?.sentence
    ).toBe(own.text);
  });

  it("returns null when no sentence contains the word", () => {
    expect(pickSentence(word("minum"), [a, b], undefined, new Set(), lex)).toBe(
      null
    );
  });
});

describe("sentence pool", () => {
  it("has the shard files", () => {
    expect(readdirSync(poolDir)).toHaveLength(512);
  });

  it.each(["makan", "rumah", "kesempatan", "terima kasih", "beli"])(
    "has sentences for %s that contain it",
    (key) => {
      const sentences = shard(key)[key];
      expect(sentences.length).toBeGreaterThanOrEqual(10);
      for (const [text] of sentences) {
        expect(findSpan(text, key, lex)).not.toBe(null);
      }
    }
  );

  it("every sentence in a sample of files contains its word", () => {
    let checked = 0;
    for (const file of readdirSync(poolDir).slice(0, 8)) {
      const data: PoolShard = JSON.parse(
        readFileSync(`${poolDir}/${file}`, "utf8")
      );
      for (const [key, sentences] of Object.entries(data)) {
        expect(shardFile(shardOf(key))).toBe(file);
        for (const [text] of sentences) {
          expect(findSpan(text, key, lex), `${key}: ${text}`).not.toBe(null);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });
});
