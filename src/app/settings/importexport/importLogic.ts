import { getAdapterOfType } from "@/logic/NoteTypeAdapter";
import { Deck } from "@/logic/deck/deck";
import { NoteType } from "@/logic/note/note";

/** Adds a basic card per line; returns the notes added. */
export async function importCards(
  text: string | null,
  deck: Deck | undefined,
  cardSeparator: string,
  questionAnswerSeperator: string
): Promise<string[]> {
  if (!text || !deck) {
    return [];
  }
  const questionAnswerPairs = text
    .split(cardSeparator)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      return line.split(questionAnswerSeperator);
    });

  const ids = await Promise.all(
    questionAnswerPairs.map(async (pair) => {
      if (pair.length < 2) return undefined;
      return getAdapterOfType(NoteType.Basic).createNote(
        {
          front: pair[0],
          back: pair[1],
        },
        deck
      );
    })
  );
  return ids.filter((id): id is string => typeof id === "string");
}
