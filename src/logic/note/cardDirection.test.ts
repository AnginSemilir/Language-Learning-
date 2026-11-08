import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ db: {} }));

import type { Card } from "../card/card";
import { cardsRemovedBy, directionOf } from "./cardDirection";
import { NoteType } from "./note";

const card = (id: string, frontIsField1?: boolean, reviews = 0) =>
  ({
    id,
    note: "n",
    history: Array(reviews).fill({}),
    content:
      frontIsField1 === undefined
        ? { type: NoteType.Basic }
        : { type: NoteType.DoubleSided, frontIsField1 },
  }) as unknown as Card<NoteType>;

describe("directionOf", () => {
  it("reads the direction from the note's cards", () => {
    expect(directionOf([card("a")])).toBe("forward");
    expect(directionOf([card("a", true)])).toBe("forward");
    expect(directionOf([card("b", false)])).toBe("backward");
    expect(directionOf([card("a", true), card("b", false)])).toBe("both");
  });
});

describe("cardsRemovedBy", () => {
  const both = [card("a", true, 3), card("b", false)];
  it("names the cards a direction would delete", () => {
    expect(cardsRemovedBy(both, "both")).toEqual([]);
    expect(cardsRemovedBy(both, "forward").map((c) => c.id)).toEqual(["b"]);
    expect(cardsRemovedBy(both, "backward").map((c) => c.id)).toEqual(["a"]);
    expect(cardsRemovedBy([card("a")], "backward").map((c) => c.id)).toEqual([
      "a",
    ]);
  });
});
