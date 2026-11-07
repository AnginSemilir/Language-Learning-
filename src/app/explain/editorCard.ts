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
