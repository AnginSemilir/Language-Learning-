import { incrementDailyStat } from "@/lector/data-layer";
import getSetting from "@/logic/settings/hooks/getSetting";
import { setSetting } from "@/logic/settings/setSetting";
import type { GameId } from "./types";

const BEST = {
  match: "#games_bestMatch",
  rain: "#games_bestRain",
} as const;

/**
 * Saves a finished game: it goes into today's activity, so it counts for XP,
 * the quests and the streak, and a best score is kept (synced like the other
 * settings). Returns the best score before this game.
 */
export async function recordGame(game: GameId, score: number) {
  await incrementDailyStat("gamesPlayed");
  if (score > 0) await incrementDailyStat("gamePoints", score);
  const previousBest = Number(await getSetting(BEST[game])) || 0;
  if (score > previousBest) await setSetting(BEST[game], score);
  return { previousBest };
}

export const BEST_SCORE_SETTING = BEST;
