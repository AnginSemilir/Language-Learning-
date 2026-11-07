import type { GameWord } from "@/logic/game/gameWords";

export type GameId = "match" | "rain";

export interface GameResult {
  game: GameId;
  score: number;
  correct: number;
  mistakes: number;
  bestCombo: number;
  /** Words you mixed up or let slip, to look at again. */
  missed: GameWord[];
}

export interface GameProps {
  words: GameWord[];
  /** Sound effects and saying each word you get right. */
  sound: boolean;
  onFinish: (result: GameResult) => void;
}

/** A cheer for a run of right answers, in Indonesian. */
export function cheer(combo: number): string | null {
  if (combo >= 12 && combo % 3 === 0) return "Luar biasa!";
  if (combo === 9) return "Mantap!";
  if (combo === 6) return "Hebat!";
  if (combo === 3) return "Bagus!";
  return null;
}

/** The score multiplier for a run of right answers: ×1, then ×2 from 3… */
export function multiplier(combo: number, max: number): number {
  return Math.min(max, 1 + Math.floor(combo / 3));
}
