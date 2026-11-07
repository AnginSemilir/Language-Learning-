// Explanations by Claude, with the user's own Anthropic API key (claude.ts):
// a word or phrase in the sentence it was read in, or a flashcard. Each
// explanation is saved (db.explanations), so looking at it again costs
// nothing.

import { db } from "@/logic/db";
import type Anthropic from "@anthropic-ai/sdk";
import {
  CLAUDE_MODEL,
  ClaudeError,
  claudeClient,
  costOf,
  recordSpend,
  toClaudeError,
} from "./claude";

/** Thinking (billed as output) plus the explanation; a cap, not a target. */
const MAX_TOKENS = 8000;
/** Bump when the prompt changes, so saved explanations are asked again. */
const PROMPT_VERSION = 1;

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
  const text = `${CLAUDE_MODEL}|${PROMPT_VERSION}|${promptFor(input)}`;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  const hex = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  return hex.slice(0, 32);
}

export async function savedExplanation(
  input: ExplainInput
): Promise<Explanation | undefined> {
  return db.explanations.get(await explanationId(input));
}

/**
 * Ask Claude for an explanation and save it. `onText` gets the text so far
 * as it arrives. Throws ClaudeError, or the SDK's abort error when `signal`
 * aborts.
 */
export async function explain(
  input: ExplainInput,
  {
    onText,
    signal,
  }: { onText?: (text: string) => void; signal?: AbortSignal } = {}
): Promise<Explanation> {
  const client = await claudeClient();
  let message: Anthropic.Message;
  try {
    const stream = client.messages.stream(
      {
        model: CLAUDE_MODEL,
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
    throw await toClaudeError(e);
  }

  if (message.stop_reason === "refusal") {
    throw new ClaudeError("Claude declined to explain this one.", "refused");
  }
  const text = message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
  if (!text) {
    throw new ClaudeError(
      "Claude ran out of room before writing an explanation. Try again.",
      "cut-off"
    );
  }
  const explanation: Explanation = {
    id: await explanationId(input),
    text,
    model: CLAUDE_MODEL,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    cost: costOf(message.usage),
    createdAt: new Date(),
  };
  recordSpend(explanation.cost);
  await db.explanations.put(explanation);
  return explanation;
}
