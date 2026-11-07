import {
  type GameWord,
  type GameWordChoice,
  pickGameWords,
} from "@/logic/game/gameWords";
import { loadGameWords } from "@/logic/game/loadGameWords";
import { useLiveQuery } from "dexie-react-hooks";

export interface GameWords {
  words: GameWord[];
  /** How many of them you're learning now (the rest top them up). */
  learningNow: number;
}

/** The words for the games, from your flashcards; undefined while loading. */
export function useGameWords(choice: GameWordChoice): GameWords | undefined {
  return useLiveQuery(
    async () => pickGameWords(await loadGameWords(), choice),
    [choice]
  );
}
