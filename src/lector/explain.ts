// Explanations by Claude, with the user's own Anthropic API key: a word or
// phrase in the sentence it was read in, or a flashcard. The key stays on
// this device (localStorage, never synced). Each explanation is saved
// (db.explanations), so looking at it again costs nothing.

import { db } from "@/logic/db";
import type Anthropic from "@anthropic-ai/sdk";
import type { APIError } from "@anthropic-ai/sdk";

export const EXPLAIN_MODEL = "claude-haiku-5-5";
export const EXPLAIN_MODEL_NAME = "Claude Haiku 5.5";
/** US dollars per million tokens: Claude Haiku 5.5, prompts up to 100K tokens. */
const PRICE = { input: 0.1, cacheWrite: 0.125, cacheRead: 0.01, output: 0.5 };
/** Thinking (billed as output) plus the explanation; a cap, not a target. */
const MAX_TOKENS = 8000;
/** Bump when the prompt changes, so saved explanations are asked again. */
const PROMPT_VERSION = 1;

const KEY_STORAGE = "kartu.anthropicKey";

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setApiKey(key: string) {
  try {
    if (key.trim()) localStorage.setItem(KEY_STORAGE, key.trim());
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    // Private browsing: the key works until the page closes.
  }
}

/** What to explain: a word or phrase as read, or a flashcard. */
export type ExplainInput =
  | { kind: "word"; text: string; sentence: string }
  | { kind: "card"; front: string; back: string; example?: string };

export interface Explanation {
  id: string;
  /** Markdown. */
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** US dollars. */
  cost: number;
  createdAt: Date;
}

export const SYSTEM_PROMPT = `You help an English speaker who is learning Indonesian. They tapped a word or phrase while reading, or they are reviewing a flashcard, and want a short explanation of it.

Write in English, in under 150 words, as Markdown: a few short bullet points, with Indonesian words in bold. No headings and no introduction.

Cover what applies:
- What it means here, and its other common meanings if they differ.
- How it is built: the root and any affixes (meN-, ber-, di-, ter-, pe-…-an, ke-…-an, -kan, -i, -nya, reduplication) and what each adds.
- How formal it is (formal, neutral, everyday, slang or regional), and the more usual word if this one is formal, old-fashioned or rare.
- One or two short example sentences in natural Indonesian, each with an English translation.

If the flashcard's English is wrong or misleading, say so first, in one line.`;

export function promptFor(input: ExplainInput): string {
  if (input.kind === "word") {
    const what = /\s/.test(input.text.trim()) ? "Phrase" : "Word";
    const lines = [`${what}: ${input.text.trim()}`];
    if (input.sentence.trim()) {
      lines.push(`In this sentence: "${input.sentence.trim()}"`);
    }
    return lines.join("\n");
  }
  const lines = [
    "Flashcard",
    `Indonesian: ${input.front.trim()}`,
    `English: ${input.back.trim()}`,
  ];
  if (input.example?.trim()) {
    lines.push(`Example on the card: ${input.example.trim()}`);
  }
  return lines.join("\n");
}

/** One id per model, prompt version and question. */
export async function explanationId(input: ExplainInput): Promise<string> {
  const text = `${EXPLAIN_MODEL}|${PROMPT_VERSION}|${promptFor(input)}`;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  const hex = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  return hex.slice(0, 32);
}

export function costOf(usage: Anthropic.Usage): number {
  return (
    (usage.input_tokens * PRICE.input +
      (usage.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite +
      (usage.cache_read_input_tokens ?? 0) * PRICE.cacheRead +
      usage.output_tokens * PRICE.output) /
    1_000_000
  );
}

/** "$0.0006", or "under $0.0001". */
export function formatCost(dollars: number): string {
  if (dollars < 0.0001) return "under $0.0001";
  if (dollars < 0.01) return `$${dollars.toFixed(4)}`;
  return `$${dollars.toFixed(2)}`;
}

export type ExplainProblem =
  | "key"
  | "busy"
  | "offline"
  | "refused"
  | "cut-off"
  | "other";

export class ExplainError extends Error {
  constructor(
    message: string,
    readonly problem: ExplainProblem
  ) {
    super(message);
  }
}

export async function savedExplanation(
  input: ExplainInput
): Promise<Explanation | undefined> {
  return db.explanations.get(await explanationId(input));
}

/** What Anthropic said was wrong with a request, without the status code. */
function apiMessage(e: APIError) {
  const body = e.error as { error?: { message?: string } } | undefined;
  return body?.error?.message ?? e.message;
}

async function toExplainError(e: unknown): Promise<unknown> {
  const { default: SDK } = await import("@anthropic-ai/sdk");
  if (e instanceof SDK.APIUserAbortError) return e;
  if (e instanceof SDK.AuthenticationError) {
    return new ExplainError(
      "Anthropic didn't accept the API key. Check it in Settings → Dictionary.",
      "key"
    );
  }
  if (e instanceof SDK.PermissionDeniedError) {
    return new ExplainError(
      `This API key can't be used for this: ${apiMessage(e)}`,
      "key"
    );
  }
  if (e instanceof SDK.RateLimitError) {
    return new ExplainError(
      "Too many requests at once. Try again in a minute.",
      "busy"
    );
  }
  if (e instanceof SDK.InternalServerError) {
    return new ExplainError(
      "Anthropic is busy right now. Try again in a moment.",
      "busy"
    );
  }
  if (e instanceof SDK.APIConnectionError) {
    return new ExplainError(
      "Couldn't reach Anthropic. Are you online?",
      "offline"
    );
  }
  if (e instanceof SDK.APIError) {
    // A low credit balance, among others: Anthropic's own words say it best.
    return new ExplainError(apiMessage(e), "other");
  }
  return e;
}

/**
 * Ask Claude for an explanation and save it. `onText` gets the text so far
 * as it arrives. Throws ExplainError, or the SDK's abort error when `signal`
 * aborts.
 */
export async function explain(
  input: ExplainInput,
  {
    onText,
    signal,
  }: { onText?: (text: string) => void; signal?: AbortSignal } = {}
): Promise<Explanation> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new ExplainError(
      "Add your Anthropic API key in Settings → Dictionary.",
      "key"
    );
  }
  const { default: SDK } = await import("@anthropic-ai/sdk");
  // The key is the user's own, typed in on this device: calling the API from
  // the browser exposes it to no one else.
  const client = new SDK({ apiKey, dangerouslyAllowBrowser: true });
  let message: Anthropic.Message;
  try {
    const stream = client.messages.stream(
      {
        model: EXPLAIN_MODEL,
        max_tokens: MAX_TOKENS,
        // Claude Haiku 5.5 thinks adaptively by default; medium is its
        // default effort, set here so the cost doesn't drift.
        output_config: { effort: "medium" },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: promptFor(input) }],
      },
      { signal }
    );
    if (onText) stream.on("text", (_delta, snapshot) => onText(snapshot));
    message = await stream.finalMessage();
  } catch (e) {
    throw await toExplainError(e);
  }

  if (message.stop_reason === "refusal") {
    throw new ExplainError("Claude declined to explain this one.", "refused");
  }
  const text = message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
  if (!text) {
    throw new ExplainError(
      "Claude ran out of room before writing an explanation. Try again.",
      "cut-off"
    );
  }
  const explanation: Explanation = {
    id: await explanationId(input),
    text,
    model: EXPLAIN_MODEL,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    cost: costOf(message.usage),
    createdAt: new Date(),
  };
  await db.explanations.put(explanation);
  return explanation;
}
