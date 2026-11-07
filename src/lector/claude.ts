// Calling Claude with the user's own Anthropic API key, from the browser.
// The key stays on this device (localStorage, never synced). Used for
// explanations (explain.ts) and for writing flashcards (cardWriter.ts).

import type Anthropic from "@anthropic-ai/sdk";
import type { APIError } from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-haiku-5-5";
export const CLAUDE_MODEL_NAME = "Claude Haiku 5.5";
/** US dollars per million tokens: Claude Haiku 5.5, prompts up to 100K tokens. */
const PRICE = { input: 0.1, cacheWrite: 0.125, cacheRead: 0.01, output: 0.5 };

const KEY_STORAGE = "kartu.anthropicKey";
const SPENT_STORAGE = "kartu.claudeSpent";

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

/** US dollars spent on Claude from this device, as far as the app knows. */
export function getSpent(): number {
  try {
    return Number(localStorage.getItem(SPENT_STORAGE)) || 0;
  } catch {
    return 0;
  }
}

export function recordSpend(dollars: number) {
  try {
    localStorage.setItem(SPENT_STORAGE, String(getSpent() + dollars));
  } catch {
    // A convenience only.
  }
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

export type ClaudeProblem =
  | "key"
  | "busy"
  | "offline"
  | "refused"
  | "cut-off"
  | "other";

export class ClaudeError extends Error {
  constructor(
    message: string,
    readonly problem: ClaudeProblem
  ) {
    super(message);
  }
}

/**
 * A client with the user's key. The key is their own, typed in on this
 * device, so calling the API from the browser exposes it to no one else.
 */
export async function claudeClient() {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new ClaudeError(
      "Add your Anthropic API key in Settings → Dictionary.",
      "key"
    );
  }
  const { default: SDK } = await import("@anthropic-ai/sdk");
  return new SDK({ apiKey, dangerouslyAllowBrowser: true });
}

/** What Anthropic said was wrong with a request, without the status code. */
function apiMessage(e: APIError) {
  const body = e.error as { error?: { message?: string } } | undefined;
  return body?.error?.message ?? e.message;
}

/** The SDK's errors as ClaudeErrors, in words; an abort stays as it is. */
export async function toClaudeError(e: unknown): Promise<unknown> {
  const { default: SDK } = await import("@anthropic-ai/sdk");
  if (e instanceof SDK.APIUserAbortError) return e;
  if (e instanceof SDK.AuthenticationError) {
    return new ClaudeError(
      "Anthropic didn't accept the API key. Check it in Settings → Dictionary.",
      "key"
    );
  }
  if (e instanceof SDK.PermissionDeniedError) {
    return new ClaudeError(
      `This API key can't be used for this: ${apiMessage(e)}`,
      "key"
    );
  }
  if (e instanceof SDK.RateLimitError) {
    return new ClaudeError(
      "Too many requests at once. Try again in a minute.",
      "busy"
    );
  }
  if (e instanceof SDK.InternalServerError) {
    return new ClaudeError(
      "Anthropic is busy right now. Try again in a moment.",
      "busy"
    );
  }
  if (e instanceof SDK.APIConnectionError) {
    return new ClaudeError(
      "Couldn't reach Anthropic. Are you online?",
      "offline"
    );
  }
  if (e instanceof SDK.APIError) {
    // A low credit balance, among others: Anthropic's own words say it best.
    return new ClaudeError(apiMessage(e), "other");
  }
  return e;
}
