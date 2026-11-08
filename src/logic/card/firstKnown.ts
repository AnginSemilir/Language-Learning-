// Known first sent a card away for the maximum interval, 100 years. Those
// cards are familiar now: they come back once, in one to six months, for a
// check (db.ts, version 29). Kept apart from known.ts, which uses the
// settings hooks, so the database module can use it.
import { State } from "fsrs.js";
import type { NoteType } from "../note/note";
import { defaultSettings } from "../settings/defaultSettings";
import type { Card } from "./card";

const DAY_MS = 24 * 60 * 60 * 1000;
/** At or past this, a card was sent away by the first Known. */
const FIRST_KNOWN_DAYS = 36500;

/** Makes such a card familiar, in place; returns false for any other card. */
export function bringBackFirstKnown(
  card: Pick<Card<NoteType>, "model" | "known">,
  now: Date,
  random = Math.random
): boolean {
  const model = card.model;
  if (
    card.known ||
    model.state !== State.Review ||
    model.scheduled_days < FIRST_KNOWN_DAYS
  ) {
    return false;
  }
  const min = defaultSettings["#learn_familiarMinDays"];
  const max = defaultSettings["#learn_familiarMaxDays"];
  const days = min + Math.floor(random() * (max - min + 1));
  model.scheduled_days = days;
  // Remembered about that long: a Good when it comes back sends it further.
  model.stability = days;
  model.due = new Date(now.getTime() + days * DAY_MS);
  card.known = "familiar";
  return true;
}
