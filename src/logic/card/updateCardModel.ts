import { Card as Model, ReviewLog } from "fsrs.js";
import { db } from "../db";
import { invalidateDeckStatsCacheForCard } from "../deck/deckStatsCacheManager";
import { NoteType } from "../note/note";
import { Card, KnownLevel } from "./card";

/**
 * Sets a card's familiar/known level, or clears it (undefined). Done with
 * modify, which writes the whole card: an update with an undefined value
 * leaves the field as it was.
 */
export function setCardLevel(cardId: string, known: KnownLevel | undefined) {
  return db.cards
    .where("id")
    .equals(cardId)
    .modify((card) => {
      card.known = known;
    });
}

/**
 * Saves an answer. `known` sets the card's familiar/known level, null clears
 * it, and leaving it out keeps it as it is.
 */
export async function updateCardModel(
  card: Card<NoteType>,
  model: Model,
  log: ReviewLog,
  known?: KnownLevel | null
) {
  await db.cards.update(card.id, {
    model: model,
    history: [...card.history, log],
  });
  if (known !== undefined) await setCardLevel(card.id, known ?? undefined);

  await invalidateDeckStatsCacheForCard(card.id);
}
