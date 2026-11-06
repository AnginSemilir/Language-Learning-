import type { DailyLimits } from "../dailyQueue";
import getSetting from "./hooks/getSetting";
import { useSetting } from "./hooks/useSetting";

/** The daily-limit settings (Settings → Learning), read once. */
export async function getDailyLimits(): Promise<DailyLimits> {
  const [
    newPerDay,
    reviewsPerDay,
    newOrder,
    buryNewSiblings,
    buryReviewSiblings,
    dayStartHour,
  ] = await Promise.all([
    getSetting("#learn_newCardsPerDay"),
    getSetting("#learn_maxReviewsPerDay"),
    getSetting("#learn_newCardOrder"),
    getSetting("#learn_buryNewSiblings"),
    getSetting("#learn_buryReviewSiblings"),
    getSetting("#newDayStartHour"),
  ]);
  return {
    newPerDay,
    reviewsPerDay,
    newOrder,
    buryNewSiblings,
    buryReviewSiblings,
    dayStartHour,
  };
}

/** The daily-limit settings, kept up to date. */
export function useDailyLimits(): DailyLimits {
  const [newPerDay] = useSetting("#learn_newCardsPerDay");
  const [reviewsPerDay] = useSetting("#learn_maxReviewsPerDay");
  const [newOrder] = useSetting("#learn_newCardOrder");
  const [buryNewSiblings] = useSetting("#learn_buryNewSiblings");
  const [buryReviewSiblings] = useSetting("#learn_buryReviewSiblings");
  const [dayStartHour] = useSetting("#newDayStartHour");
  return {
    newPerDay,
    reviewsPerDay,
    newOrder,
    buryNewSiblings,
    buryReviewSiblings,
    dayStartHour,
  };
}
