import { notify } from "@/components/Notification";
import { genericFail } from "@/components/Notification/Notification";
import { CardSorts } from "@/logic/card/CardSorting";
import type { KnownLevel } from "@/logic/card/card";
import { getCardsOf } from "@/logic/card/getCardsOf";
import { CognitivePrompt } from "@/logic/cognitivePrompts";
import { Deck } from "@/logic/deck/deck";
import { useLearning } from "@/logic/learn";
import { getDailyLimits } from "@/logic/settings/dailyLimits";
import { useSetting } from "@/logic/settings/hooks/useSetting";
import { numberSetting } from "@/logic/settings/sanitize";
import { useLiveQuery } from "dexie-react-hooks";
import { Rating } from "fsrs.js";
import { useCallback, useState } from "react";

interface UseLearnSessionOptions {
  deck: Deck | undefined;
  learnAll: boolean;
  newToReviewRatio: number;
}

export function useLearnSession({
  deck,
  learnAll,
  newToReviewRatio,
}: UseLearnSessionOptions) {
  const limits = useLiveQuery(() => getDailyLimits(), []);
  const [newReviewOrder] = useSetting("#learn_newReviewOrder");
  const controller = useLearning(
    {
      querier: () => getCardsOf(deck),
      dependencies: [deck],
    },
    {
      learnAll,
      newToReviewRatio: numberSetting(newToReviewRatio, 0.5, 0, 1),
      sort: CardSorts.byCreationDate(1),
      limits,
      newReviewOrder,
    }
  );

  const [currentRating, setCurrentRating] = useState<Rating | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<CognitivePrompt | null>(
    null
  );
  const cardShowsMastery = useCallback(() => {
    const model = controller.currentCard?.model;
    if (!model) return false;
    return model.reps >= 2;
  }, [controller.currentCard]);

  const answerCard = useCallback(
    async (rating: Rating) => {
      try {
        const outcome = controller.answerCard(rating);
        controller.requestNextCard();
        if (outcome === "known") {
          notify(
            "Known",
            "You got this familiar card right, so it's known now: it won't come back.",
            "success",
            2500
          );
        }
        setCurrentRating(rating);
        setTimeout(() => setCurrentRating(null), 150);

        setSelectedPrompt(null);
      } catch (error) {
        genericFail();
        console.log(error);
      }
    },
    [controller, cardShowsMastery]
  );

  /** Returns for how many days the card went away, or null if it failed. */
  const markKnown = useCallback(
    (level: KnownLevel): number | null => {
      try {
        const days = controller.markKnown(level);
        controller.requestNextCard();
        setCurrentRating(Rating.Easy);
        setTimeout(() => setCurrentRating(null), 150);
        setSelectedPrompt(null);
        return days;
      } catch (error) {
        genericFail();
        console.log(error);
        return null;
      }
    },
    [controller]
  );

  const togglePrompt = useCallback(
    (prompt: CognitivePrompt) => {
      if (selectedPrompt === prompt) {
        setSelectedPrompt(null);
      } else {
        setSelectedPrompt(prompt);
      }
    },
    [selectedPrompt]
  );

  const closeQuickAdd = useCallback(() => {
    setSelectedPrompt(null);
  }, []);

  return {
    controller,
    currentRating,
    selectedPrompt,
    showPrompts: cardShowsMastery(),
    answerCard,
    markKnown,
    togglePrompt,
    closeQuickAdd,
  };
}
