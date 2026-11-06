// Ported from Lector (heuwels/lector@eb393ce, AGPL-3.0-only): src/app/practice/persist-review.ts
// Changes: sonner toasts replaced with Skola notifications; progress is saved
// per flashcard word (../cardCloze) instead of per bank sentence.
import { notify } from "@/components/Notification";
import { recordCardPractice, saveCardReview } from "../cardCloze";
import type { ClozeMasteryLevel, ClozeSentence } from "../types";

/**
 * Persist one graded practice answer (#232).
 *
 * The word's schedule is the source of truth: if that write fails, nothing
 * may advance, so this returns false and surfaces the error. The word-state
 * and daily-stat writes are best-effort.
 */
export async function persistReview(
  sentence: ClozeSentence,
  isCorrect: boolean,
  earnedPoints: number,
  newMastery: ClozeMasteryLevel,
  nextReview: Date
): Promise<boolean> {
  const saved = await saveCardReview(
    sentence,
    isCorrect,
    newMastery,
    nextReview
  );
  if (!saved) {
    notify("Not saved", "Could not save your answer. Try again.", "error");
    return false;
  }
  if (!(await recordCardPractice(sentence, newMastery, earnedPoints))) {
    notify(
      "Stats not updated",
      "Your answer was saved, but updating your stats failed.",
      "error"
    );
  }
  return true;
}
