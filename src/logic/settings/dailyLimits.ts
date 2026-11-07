import type { DailyLimits } from "../dailyQueue";
import { defaultSettings } from "./defaultSettings";
import getSetting from "./hooks/getSetting";
import { useSetting } from "./hooks/useSetting";
import { integerSetting } from "./sanitize";

/** The hour a study day starts, 0–23 (4 when the setting is unusable). */
export function dayStartHourSetting(value: unknown): number {
  return integerSetting(value, defaultSettings["#newDayStartHour"], 0, 23);
}

/**
 * Daily limits from the raw settings, each checked: a cleared or negative
 * number field falls back to the default instead of hiding every new card.
 */
export function sanitizeDailyLimits(raw: {
  newPerDay: unknown;
  reviewsPerDay: unknown;
  newOrder: unknown;
  buryNewSiblings: unknown;
  buryReviewSiblings: unknown;
  dayStartHour: unknown;
}): DailyLimits {
  return {
    newPerDay: integerSetting(
      raw.newPerDay,
      defaultSettings["#learn_newCardsPerDay"],
      0,
      9999
    ),
    reviewsPerDay: integerSetting(
      raw.reviewsPerDay,
      defaultSettings["#learn_maxReviewsPerDay"],
      0,
      99999
    ),
    newOrder: raw.newOrder === "random" ? "random" : "added",
    buryNewSiblings: raw.buryNewSiblings === true,
    buryReviewSiblings: raw.buryReviewSiblings === true,
    dayStartHour: dayStartHourSetting(raw.dayStartHour),
  };
}

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
  return sanitizeDailyLimits({
    newPerDay,
    reviewsPerDay,
    newOrder,
    buryNewSiblings,
    buryReviewSiblings,
    dayStartHour,
  });
}

/** The daily-limit settings, kept up to date. */
export function useDailyLimits(): DailyLimits {
  const [newPerDay] = useSetting("#learn_newCardsPerDay");
  const [reviewsPerDay] = useSetting("#learn_maxReviewsPerDay");
  const [newOrder] = useSetting("#learn_newCardOrder");
  const [buryNewSiblings] = useSetting("#learn_buryNewSiblings");
  const [buryReviewSiblings] = useSetting("#learn_buryReviewSiblings");
  const [dayStartHour] = useSetting("#newDayStartHour");
  return sanitizeDailyLimits({
    newPerDay,
    reviewsPerDay,
    newOrder,
    buryNewSiblings,
    buryReviewSiblings,
    dayStartHour,
  });
}
