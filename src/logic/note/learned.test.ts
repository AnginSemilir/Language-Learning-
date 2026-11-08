import { Card as Model, State } from "fsrs.js";
import { describe, expect, it } from "vitest";
import type { Card, KnownLevel } from "../card/card";
import { noteLevel } from "./learned";
import type { NoteType } from "./note";

function card({
  state = State.New,
  days = 0,
  known,
  reverse = false,
}: {
  state?: State;
  days?: number;
  known?: KnownLevel;
  reverse?: boolean;
} = {}) {
  const model = new Model();
  Object.assign(model, { state, scheduled_days: days });
  return {
    id: Math.random().toString(),
    note: "n",
    deck: "d",
    model,
    known,
    content: { frontIsField1: !reverse },
  } as unknown as Card<NoteType>;
}

describe("noteLevel", () => {
  it("names a card's stage, or familiar and known", () => {
    expect(noteLevel([card()])?.label).toBe("Seed");
    expect(noteLevel([card({ state: State.Learning })])?.label).toBe("Sapling");
    expect(noteLevel([card({ state: State.Review, days: 30 })])?.label).toBe(
      "Oak"
    );
    expect(noteLevel([card({ known: "familiar" })])?.label).toBe("Familiar");
    expect(noteLevel([card({ known: "known" })])?.label).toBe("Known");
    expect(noteLevel([])).toBeUndefined();
  });

  it("shows both of a two-sided note's cards, front → back first", () => {
    const level = noteLevel([
      card({ reverse: true }),
      card({ state: State.Review, days: 30 }),
    ]);
    expect(level?.label).toBe("Oak / Seed");
    expect(
      noteLevel([
        card({ known: "known" }),
        card({ known: "known", reverse: true }),
      ])?.label
    ).toBe("Known");
  });

  it("sorts by the further card, then the other", () => {
    const rank = (cards: Card<NoteType>[]) => noteLevel(cards)?.rank ?? -1;
    const oakSeed = rank([card({ state: State.Review, days: 30 }), card()]);
    const oakOak = rank([
      card({ state: State.Review, days: 30 }),
      card({ state: State.Review, days: 40 }),
    ]);
    const known = rank([card({ known: "known" })]);
    expect(oakSeed).toBeLessThan(oakOak);
    expect(oakOak).toBeLessThan(known);
  });
});
