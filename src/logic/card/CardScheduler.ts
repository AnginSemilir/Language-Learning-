import * as fsrsjs from "fsrs.js";
import { useMemo } from "react";
import { defaultSettings } from "../settings/defaultSettings";
import { useSetting } from "../settings/hooks/useSetting";
import {
  integerSetting,
  numberSetting,
  weightsSetting,
} from "../settings/sanitize";

/**
 * FSRS with the user's parameters. Each one is checked first: an empty or
 * out-of-range setting falls back to the default instead of producing
 * intervals of 0 days, 100 years or NaN.
 */
export function createScheduler(
  maximumInterval: unknown,
  requestRetention: unknown,
  w: unknown
): fsrsjs.FSRS {
  const scheduler = new fsrsjs.FSRS();
  scheduler.p.maximum_interval = integerSetting(
    maximumInterval,
    defaultSettings["#globalScheduler_maximumInterval"],
    1,
    36500
  );
  scheduler.p.request_retention = numberSetting(
    requestRetention,
    defaultSettings["#globalScheduler_requestRetention"],
    0.7,
    0.99
  );
  scheduler.p.w = weightsSetting(w, defaultSettings["#globalScheduler_w"]);
  return scheduler;
}

/** The scheduler for the current settings, rebuilt when they change. */
export function useGlobalScheduler() {
  const [maximumInterval] = useSetting("#globalScheduler_maximumInterval");
  const [requestRetention] = useSetting("#globalScheduler_requestRetention");
  const [w] = useSetting("#globalScheduler_w");
  return useMemo(
    () => createScheduler(maximumInterval, requestRetention, w),
    [maximumInterval, requestRetention, w]
  );
}

/**
 * The model to schedule from. A card whose scheduling data is damaged (no
 * valid due date, stability or difficulty) never comes up again and can't be
 * rescheduled; it starts over as a new card instead.
 */
export function schedulableModel(model: fsrsjs.Card): fsrsjs.Card {
  const due = new Date(model.due).getTime();
  if (
    Number.isFinite(due) &&
    Number.isFinite(model.stability) &&
    Number.isFinite(model.difficulty)
  ) {
    return model;
  }
  return new fsrsjs.Card();
}
