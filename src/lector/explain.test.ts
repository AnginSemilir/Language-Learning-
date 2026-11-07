import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const saved = vi.hoisted(() => [] as unknown[]);
vi.mock("@/logic/db", () => ({
  db: {
    explanations: {
      put: async (row: unknown) => {
        saved.push(row);
      },
      get: async () => undefined,
    },
  },
}));

import { ClaudeError, costOf, formatCost, setApiKey } from "./claude";
import { explain, explanationId, promptFor } from "./explain";

/** A streamed Messages API response, as server-sent events. */
function sse(events: object[]) {
  const body = events
    .map(
      (e) =>
        `event: ${(e as { type: string }).type}\ndata: ${JSON.stringify(e)}\n\n`
    )
    .join("");
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

function streamed(texts: string[], stopReason = "end_turn") {
  return sse([
    {
      type: "message_start",
      message: {
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-haiku-5-5",
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 400, output_tokens: 1 },
      },
    },
    {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    },
    ...texts.map((text) => ({
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text },
    })),
    { type: "content_block_stop", index: 0 },
    {
      type: "message_delta",
      delta: { stop_reason: stopReason, stop_sequence: null },
      usage: { output_tokens: 1000 },
    },
    { type: "message_stop" },
  ]);
}

describe("promptFor", () => {
  it("asks about a word or phrase in its sentence", () => {
    expect(
      promptFor({
        kind: "word",
        text: "membutuhkan",
        sentence: "Kami membutuhkan air.",
      })
    ).toBe('Word: membutuhkan\nIn this sentence: "Kami membutuhkan air."');
    expect(promptFor({ kind: "word", text: "bulan madu", sentence: "" })).toBe(
      "Phrase: bulan madu"
    );
  });

  it("asks about a flashcard with its example", () => {
    expect(
      promptFor({
        kind: "card",
        front: "cemburu",
        back: "jealous",
        example: "Dia cemburu.",
      })
    ).toBe(
      "Flashcard\nIndonesian: cemburu\nEnglish: jealous\nExample on the card: Dia cemburu."
    );
  });
});

describe("explanationId", () => {
  it("is the same for the same question and differs otherwise", async () => {
    const a = await explanationId({
      kind: "word",
      text: "makan",
      sentence: "x",
    });
    const b = await explanationId({
      kind: "word",
      text: "makan",
      sentence: "x",
    });
    const c = await explanationId({
      kind: "word",
      text: "makan",
      sentence: "y",
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("costOf and formatCost", () => {
  it("prices Claude Haiku 5.5 tokens", () => {
    const cost = costOf({
      input_tokens: 400,
      output_tokens: 1000,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
    } as never);
    expect(cost).toBeCloseTo(0.00054, 8);
    expect(formatCost(cost)).toBe("$0.0005");
    expect(formatCost(0.00001)).toBe("under $0.0001");
    expect(formatCost(0.42)).toBe("$0.42");
  });
});

describe("explain", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    saved.length = 0;
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    setApiKey("sk-ant-test");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    setApiKey("");
  });

  it("streams Claude Haiku 5.5's answer at medium effort, and saves it", async () => {
    fetchMock.mockResolvedValue(streamed(["- **bulan madu**", ": honeymoon"]));
    const seen: string[] = [];
    const result = await explain(
      {
        kind: "word",
        text: "bulan madu",
        sentence: "Mereka pergi bulan madu.",
      },
      { onText: (t) => seen.push(t) }
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.anthropic.com/v1/messages");
    const headers = init.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer sk-ant-test");
    expect(headers.get("anthropic-dangerous-direct-browser-access")).toBe(
      "true"
    );
    const body = JSON.parse(init.body);
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.output_config).toEqual({ effort: "medium" });
    expect(body.stream).toBe(true);
    expect(body.thinking).toBeUndefined();
    expect(body.temperature).toBeUndefined();
    expect(body.messages[0].content).toBe(
      'Phrase: bulan madu\nIn this sentence: "Mereka pergi bulan madu."'
    );

    expect(seen.at(-1)).toBe("- **bulan madu**: honeymoon");
    expect(result.text).toBe("- **bulan madu**: honeymoon");
    expect(result.outputTokens).toBe(1000);
    expect(result.cost).toBeCloseTo(0.00054, 8);
    expect(saved).toEqual([result]);
  });

  it("says when the key isn't accepted", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "error",
          error: { type: "authentication_error", message: "invalid x-api-key" },
        }),
        { status: 401, headers: { "content-type": "application/json" } }
      )
    );
    const error = await explain({
      kind: "word",
      text: "makan",
      sentence: "",
    }).catch((e) => e);
    expect(error).toBeInstanceOf(ClaudeError);
    expect(error.problem).toBe("key");
    expect(saved).toEqual([]);
  });

  it("passes on Anthropic's words for other refused requests", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "error",
          error: {
            type: "invalid_request_error",
            message:
              "Your credit balance is too low to access the Anthropic API.",
          },
        }),
        { status: 400, headers: { "content-type": "application/json" } }
      )
    );
    const error = await explain({
      kind: "word",
      text: "makan",
      sentence: "",
    }).catch((e) => e);
    expect(error.message).toBe(
      "Your credit balance is too low to access the Anthropic API."
    );
  });

  it("doesn't save a refusal", async () => {
    fetchMock.mockResolvedValue(streamed([], "refusal"));
    const error = await explain({
      kind: "word",
      text: "makan",
      sentence: "",
    }).catch((e) => e);
    expect(error.problem).toBe("refused");
    expect(saved).toEqual([]);
  });

  it("needs a key", async () => {
    setApiKey("");
    const error = await explain({
      kind: "word",
      text: "makan",
      sentence: "",
    }).catch((e) => e);
    expect(error.problem).toBe("key");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
