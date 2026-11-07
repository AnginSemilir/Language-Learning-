// Claude writes flashcards: a new card from a word in either language, or a
// fix for an existing card (its word, its meaning and an example sentence),
// as structured JSON so the answer drops straight into the card's fields.

import { db } from "@/logic/db";
import { backHtml, frontHtml } from "@/logic/import/importFlashcards";
import { NoteType } from "@/logic/note/note";
import { updateNoteContent } from "@/logic/note/updateNoteContent";
import {
  CLAUDE_MODEL,
  ClaudeError,
  claudeClient,
  costOf,
  recordSpend,
  toClaudeError,
} from "./claude";
import { noteText } from "./flashcards";

/** A card's text: the Indonesian, its English meaning, an example sentence. */
export interface CardDraft {
  front: string;
  back: string;
  example: string;
}

export interface CardSuggestion extends CardDraft {
  /** What was changed and why, in a sentence. */
  changes: string;
  /** US dollars. */
  cost: number;
}

/** Thinking (billed as output) plus the card; a cap, not a target. */
const MAX_TOKENS = 8000;

const FIELDS = {
  front: {
    type: "string",
    description: "The Indonesian word or phrase, as it is usually written.",
  },
  back: {
    type: "string",
    description:
      "Its English meaning: a few words, not a definition. Several common senses separated by semicolons.",
  },
  example: {
    type: "string",
    description:
      "One short, natural Indonesian sentence that uses the word or phrase in its most common sense.",
  },
} as const;

const NEW_CARD_SCHEMA = {
  type: "object",
  properties: FIELDS,
  required: ["front", "back", "example"],
  additionalProperties: false,
} as const;

const UPDATE_SCHEMA = {
  type: "object",
  properties: {
    ...FIELDS,
    changes: {
      type: "string",
      description:
        "One short sentence: what you changed and why, or that nothing needed changing.",
    },
  },
  required: ["front", "back", "example", "changes"],
  additionalProperties: false,
} as const;

export const NEW_CARD_PROMPT = `You make Indonesian–English flashcards for an English speaker learning Indonesian.

The user gives the Indonesian side, the English side, or both; either may be empty. Fill in the card:
- front: the Indonesian word or phrase. Keep the form the user gave (for example a meN- verb or a word with -nya) unless it is misspelled. If only English is given, use the most common everyday Indonesian word for it.
- back: a short, accurate English meaning. If a sentence the word was read in is given, the meaning it has there comes first.
- example: one short, natural Indonesian sentence using it, the kind a native speaker would say or write. If the user gave an example that is already natural and correct, keep it.`;

export const UPDATE_PROMPT = `You keep an English speaker's Indonesian–English flashcards accurate and useful.

Given a card, and possibly an explanation of it, return the card as it should be:
- front: the Indonesian word or phrase. Keep the user's chosen form (for example a meN- verb) unless it is misspelled.
- back: a short, accurate English meaning, a few words rather than a definition.
- example: one short, natural Indonesian sentence using it in its most common sense. Keep the card's example if it is already natural and correct; add one if the card has none.
- changes: one short sentence saying what you changed and why.

Change only what is wrong, misleading or missing, and keep everything else exactly as it is.`;

function lines(entries: [string, string | undefined][]) {
  return entries
    .filter(([, value]) => value?.trim())
    .map(([label, value]) => `${label}: ${value?.trim()}`)
    .join("\n");
}

export function newCardPrompt(input: {
  front: string;
  back: string;
  example?: string;
  sentence?: string;
}) {
  return [
    "Make a flashcard.",
    lines([
      ["Indonesian", input.front || "(empty)"],
      ["English", input.back || "(empty)"],
      ["Example", input.example],
      ["Read in this sentence", input.sentence],
    ]),
  ].join("\n");
}

export function updatePrompt(card: CardDraft, explanation?: string) {
  const parts = [
    "The card:",
    lines([
      ["Indonesian", card.front],
      ["English", card.back],
      ["Example", card.example || "(none)"],
    ]),
  ];
  if (explanation?.trim()) {
    parts.push("", "Your explanation of it:", explanation.trim());
  }
  return parts.join("\n");
}

async function ask<T>(
  system: string,
  prompt: string,
  schema: typeof NEW_CARD_SCHEMA | typeof UPDATE_SCHEMA,
  signal?: AbortSignal
): Promise<{ output: T; cost: number }> {
  const client = await claudeClient();
  const { jsonSchemaOutputFormat } = await import(
    "@anthropic-ai/sdk/helpers/json-schema"
  );
  try {
    const message = await client.messages.parse(
      {
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        // Claude Haiku 5.5 thinks adaptively by default; medium is its
        // default effort, set here so the cost doesn't drift.
        output_config: {
          effort: "medium",
          format: jsonSchemaOutputFormat(schema),
        },
        system,
        messages: [{ role: "user", content: prompt }],
      },
      { signal }
    );
    const cost = costOf(message.usage);
    recordSpend(cost);
    if (message.stop_reason === "refusal") {
      throw new ClaudeError("Claude declined to write this card.", "refused");
    }
    if (!message.parsed_output) {
      throw new ClaudeError(
        "Claude's answer didn't come back as a card. Try again.",
        "cut-off"
      );
    }
    return { output: message.parsed_output as T, cost };
  } catch (e) {
    // ClaudeErrors pass through as they are.
    throw await toClaudeError(e);
  }
}

function tidy(draft: CardDraft): CardDraft {
  return {
    front: draft.front.trim(),
    back: draft.back.trim(),
    example: draft.example.trim(),
  };
}

/** A whole card from what the user typed: either side, or both. */
export async function generateCard(
  input: { front: string; back: string; example?: string; sentence?: string },
  signal?: AbortSignal
): Promise<CardDraft & { cost: number }> {
  if (!input.front.trim() && !input.back.trim()) {
    throw new ClaudeError("Type the Indonesian or the English first.", "other");
  }
  const { output, cost } = await ask<CardDraft>(
    NEW_CARD_PROMPT,
    newCardPrompt(input),
    NEW_CARD_SCHEMA,
    signal
  );
  return { ...tidy(output), cost };
}

/** The card as Claude would fix it, with what changed. */
export async function suggestCardUpdate(
  card: CardDraft,
  explanation?: string,
  signal?: AbortSignal
): Promise<CardSuggestion> {
  const { output, cost } = await ask<CardDraft & { changes: string }>(
    UPDATE_PROMPT,
    updatePrompt(card, explanation),
    UPDATE_SCHEMA,
    signal
  );
  return { ...tidy(output), changes: output.changes.trim(), cost };
}

// ── Saving to a card ───────────────────────────────────────────────────────

const PARAGRAPH = /<p(?:\s[^>]*)?>[\s\S]*?<\/p>/g;

/** The HTML after the first `count` paragraphs (pictures, notes): kept as is. */
function afterParagraphs(html: string, count: number) {
  let rest = html;
  for (let i = 0; i < count; i++) {
    const match = rest.match(new RegExp(PARAGRAPH.source));
    if (!match || match.index === undefined) break;
    rest =
      rest.slice(0, match.index) + rest.slice(match.index + match[0].length);
  }
  return rest.trim();
}

/** The fields of a basic or double-sided note's content. */
function sides(content: Record<string, unknown>) {
  return content.type === NoteType.DoubleSided
    ? ({ front: "field1", back: "field2" } as const)
    : ({ front: "front", back: "back" } as const);
}

/** The card's text as a draft, or null for a card that isn't a word card. */
export async function cardDraft(noteId: string): Promise<CardDraft | null> {
  const note = await db.notes.get(noteId);
  const text = note && noteText(note.content);
  return text
    ? { front: text.front, back: text.back, example: text.example }
    : null;
}

/**
 * Write a draft into a card. Only the sides whose text changed are
 * rewritten, and anything after the word, meaning and example (a picture,
 * a note) stays.
 */
export async function saveCardDraft(noteId: string, draft: CardDraft) {
  const note = await db.notes.get(noteId);
  const current = note && noteText(note.content);
  if (!note || !current) throw new Error("The card couldn't be found.");
  const content = { ...(note.content as unknown as Record<string, unknown>) };
  const field = sides(content);
  const next = tidy(draft);

  if (next.front !== current.front || next.example !== current.example) {
    const old = String(content[field.front] ?? "");
    const hadExample =
      (old.match(PARAGRAPH)?.length ?? 0) > 1 && !!current.example;
    const rest = afterParagraphs(old, hadExample ? 2 : 1);
    content[field.front] =
      frontHtml({ front: next.front, back: next.back, hint: next.example }) +
      rest;
  }
  if (next.back !== current.back) {
    const old = String(content[field.back] ?? "");
    content[field.back] =
      backHtml({ front: next.front, back: next.back, hint: "" }) +
      afterParagraphs(old, 1);
  }
  await updateNoteContent(noteId, content as never);
}
