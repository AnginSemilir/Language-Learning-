// How well a flashcard is learned, as a growing tree (drawn by
// components/GrowthIcon): seed (new), sapling (learning), young oak, oak and
// grand oak by the gap until the next review.

import { Card as Model, State } from "fsrs.js";

/** Days between reviews from which a flashcard counts the word as known (Anki's "mature"). */
export const MATURE_DAYS = 21;

/** From this many days between reviews a tree is a grand oak. */
export const GRAND_OAK_DAYS = 90;

export type GrowthStage = 0 | 1 | 2 | 3 | 4;

export const GROWTH_STAGES: GrowthStage[] = [0, 1, 2, 3, 4];

export const GROWTH_STAGE_NAME: Record<GrowthStage, string> = {
  0: "Seed",
  1: "Sapling",
  2: "Young oak",
  3: "Oak",
  4: "Grand oak",
};

export function growthStage(
  model: Pick<Model, "state" | "scheduled_days">
): GrowthStage {
  if (model.state === State.New) return 0;
  if (model.state !== State.Review) return 1;
  if (model.scheduled_days < MATURE_DAYS) return 2;
  if (model.scheduled_days < GRAND_OAK_DAYS) return 3;
  return 4;
}
