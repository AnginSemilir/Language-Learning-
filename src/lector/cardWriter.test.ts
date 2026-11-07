import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const notes = vi.hoisted(
  () => new Map<string, { id: string; content: unknown }>()
);
const updates = vi.hoisted(() => [] as { id: string; content: unknown }[]);
vi.mock("@/logic/db", () => ({
  db: { notes: { get: async (id: string) => notes.get(id) } },
}));
vi.mock("@/logic/note/updateNoteContent", () => ({
  updateNoteContent: async (id: string, content: unknown) => {
    updates.push({ id, content });
  },
}));

import {
  cardDraft,
  generateCard,
  newCardPrompt,
  saveCardDraft,
  suggestCardUpdate,
  updatePrompt,
} from "./cardWriter";
import { setApiKey } from "./claude";

function reply(output: object) {
  return new Response(
    JSON.stringify({
      id: "msg_test",
      type: "message",
      role: "assistant",
      model: "claude-haiku-5-5",
      content: [{ type: "text", text: JSON.stringify(output) }],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 500, output_tokens: 600 },
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

describe("prompts", () => {
  it("asks for a new card from either side and the sentence it was read in", () => {
    expect(newCardPrompt({ front: "", back: "jealous" })).toBe(
      "Make a flashcard.\nIndonesian: (empty)\nEnglish: jealous"
    );
    expect(
      newCardPrompt({ front: "madu", back: "", sentence: "Madu itu manis." })
    ).toBe(
      "Make a flashcard.\nIndonesian: madu\nEnglish: (empty)\nRead in this sentence: Madu itu manis."
    );
  });

  it("gives the card and the explanation for an update", () => {
    expect(
      updatePrompt(
        { front: "cemburu", back: "angry", example: "" },
        "- **cemburu**: jealous"
      )
    ).toBe(
      "The card:\nIndonesian: cemburu\nEnglish: angry\nExample: (none)\n\nYour explanation of it:\n- **cemburu**: jealous"
    );
  });
});

describe("asking Claude", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    setApiKey("sk-ant-test");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    setApiKey("");
  });

  it("generates a card as structured JSON from Claude Haiku 5.5", async () => {
    fetchMock.mockResolvedValue(
      reply({
        front: "cemburu",
        back: "jealous",
        example: "Dia cemburu pada adiknya.",
      })
    );
    const card = await generateCard({ front: "", back: "jealous" });
    expect(card).toEqual({
      front: "cemburu",
      back: "jealous",
      example: "Dia cemburu pada adiknya.",
      cost: (500 * 0.1 + 600 * 0.5) / 1_000_000,
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.output_config.effort).toBe("medium");
    expect(body.output_config.format.type).toBe("json_schema");
    expect(body.output_config.format.schema.required).toEqual([
      "front",
      "back",
      "example",
    ]);
  });

  it("needs something typed first", async () => {
    await expect(generateCard({ front: " ", back: "" })).rejects.toThrow(
      /Type the Indonesian or the English/
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("suggests a fixed card with what changed", async () => {
    fetchMock.mockResolvedValue(
      reply({
        front: "cemburu",
        back: "jealous",
        example: "Dia cemburu.",
        changes: "The meaning was wrong: cemburu is jealous, not angry.",
      })
    );
    const suggestion = await suggestCardUpdate(
      { front: "cemburu", back: "angry", example: "" },
      "explanation"
    );
    expect(suggestion.back).toBe("jealous");
    expect(suggestion.changes).toMatch(/jealous, not angry/);
  });
});

describe("saveCardDraft", () => {
  beforeEach(() => {
    notes.clear();
    updates.length = 0;
  });

  it("rewrites only the sides that changed, keeping what follows", async () => {
    notes.set("n1", {
      id: "n1",
      content: {
        type: "doubleSided",
        field1:
          "<p>cemburu</p><p><em>Dia marah.</em></p><p><img src='x.png'></p>",
        field2: "<p><strong>angry</strong></p>",
      },
    });
    expect(await cardDraft("n1")).toEqual({
      front: "cemburu",
      back: "angry",
      example: "Dia marah.",
    });
    await saveCardDraft("n1", {
      front: "cemburu",
      back: "jealous",
      example: "Dia cemburu pada adiknya.",
    });
    expect(updates[0].content).toEqual({
      type: "doubleSided",
      field1:
        "<p>cemburu</p><p><em>Dia cemburu pada adiknya.</em></p><p><img src='x.png'></p>",
      field2: "<p>jealous</p>",
    });
  });

  it("leaves an unchanged side's formatting alone and adds a missing example", async () => {
    notes.set("n2", {
      id: "n2",
      content: {
        type: "normal",
        front: "<p>madu</p>",
        back: "<p><em>honey</em></p>",
      },
    });
    await saveCardDraft("n2", {
      front: "madu",
      back: "honey",
      example: "Madu itu manis.",
    });
    expect(updates[0].content).toEqual({
      type: "normal",
      front: "<p>madu</p><p><em>Madu itu manis.</em></p>",
      back: "<p><em>honey</em></p>",
    });
  });
});
