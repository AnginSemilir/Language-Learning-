// Ported from Lector (heuwels/lector@eb393ce, AGPL-3.0-only): src/app/practice/persist-review.ts
// Changes: sonner toasts replaced with Skola notifications; data-layer is the
// IndexedDB port in ../data-layer.
import { notify } from "@/components/Notification";
import {
  type ClozeMasteryLevel,
  incrementDailyStat,
  updateClozeAfterReview,
  updateWordState,
} from "../data-layer";
import { splitTrailingPunctuation } from "../lib/words";

/**
 * Persist one graded practice answer (#232).
 *
 * The cloze review row is the source of truth: if that write fails, nothing
 * may advance, so this returns false and surfaces the error. The word-state
 * and daily-stat writes are best-effort.
 */
export async function persistReview(
  sentenceId: string,
  clozeWord: string,
  isCorrect: boolean,
  earnedPoints: number,
  newMastery: ClozeMasteryLevel,
  nextReview: Date
): Promise<boolean> {
  const saved = await updateClozeAfterReview(
    sentenceId,
    isCorrect,
    newMastery,
    nextReview
  );
  if (!saved) {
    notify("Not saved", "Could not save your answer. Try again.", "error");
    return false;
  }

  let secondaryOk = true;
  if (newMastery === 100) {
    secondaryOk = await updateWordState(
      splitTrailingPunctuation(clozeWord)[0],
      "known"
    );
  }
  secondaryOk = (await incrementDailyStat("clozePracticed")) && secondaryOk;
  if (earnedPoints > 0) {
    secondaryOk =
      (await incrementDailyStat("points", earnedPoints)) && secondaryOk;
  }
  if (!secondaryOk) {
    notify(
      "Stats not updated",
      "Your answer was saved, but updating your stats failed.",
      "error"
    );
  }
  return true;
}
