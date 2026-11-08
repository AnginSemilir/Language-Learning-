// Known first sent a card away for the maximum interval, 100 years. It now
// means a check in one to six months, so the cards marked before are brought
// into that range once (db.ts, version 29). Kept apart from known.ts, which
// uses the settings hooks, so the database module can use it.
import { State } from "fsrs.js";
import { defaultSettings } from "../settings/defaultSettings";

const DAY_MS = 24 * 60 * 60 * 1000;
/** At or past this, a card was sent away by the first Known. */
const FIRST_KNOWN_DAYS = 36500;

/** Reschedules such a card in place; returns false for any other card. */
export function bringBackFirstKnown(
  model: { state: State; scheduled_days: number; stability: number; due: Date },
  now: Date,
  random = Math.random
): boolean {
  if (model.state !== State.Review || model.scheduled_days < FIRST_KNOWN_DAYS) {
    return false;
  }
  const min = defaultSettings["#learn_knownMinDays"];
  const max = defaultSettings["#learn_knownMaxDays"];
  const days = min + Math.floor(random() * (max - min + 1));
  model.scheduled_days = days;
  // Remembered about that long: a Good when it comes back sends it further.
  model.stability = days;
  model.due = new Date(now.getTime() + days * DAY_MS);
  return true;
}
