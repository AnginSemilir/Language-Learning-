// Reading and filling a card editor's two fields for "Generate with AI": the
// front holds the word with an example sentence under it, the back the
// meaning (the same layout as imported and reader cards).
import type { CardDraft } from "@/lector/cardWriter";
import { backHtml, frontHtml } from "@/logic/import/importFlashcards";
import type { Editor } from "@tiptap/react";

export function readEditors(front: Editor | null, back: Editor | null) {
  const lines = (front?.getText({ blockSeparator: "\n" }) ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    front: lines[0] ?? "",
    example: lines[1],
    back: (back?.getText({ blockSeparator: "; " }) ?? "").trim(),
  };
}

export function fillEditors(
  front: Editor | null,
  back: Editor | null,
  card: CardDraft
) {
  const row = { front: card.front, back: card.back, hint: card.example };
  front?.commands.setContent(frontHtml(row), true);
  back?.commands.setContent(backHtml(row), true);
}

/**
 * What Google Translate translates in the editor: the Indonesian front into
 * English, or, with only the back typed, the English into Indonesian.
 */
export function editorToTranslate(front: Editor | null, back: Editor | null) {
  const { front: word, back: meaning } = readEditors(front, back);
  if (word) return { text: word, from: "id" as const, to: "en" as const };
  if (meaning) return { text: meaning, from: "en" as const, to: "id" as const };
  return null;
}

/** Puts Google's translation on its side: English on the back, Indonesian on the front. */
export function fillTranslation(
  front: Editor | null,
  back: Editor | null,
  text: string,
  to: "id" | "en"
) {
  const { front: word, example } = readEditors(front, back);
  if (to === "en") {
    back?.commands.setContent(
      backHtml({ front: word, back: text, hint: "" }),
      true
    );
  } else {
    front?.commands.setContent(
      frontHtml({ front: text, back: "", hint: example }),
      true
    );
  }
}
