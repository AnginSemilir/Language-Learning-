import { db } from "../db";
import { Deck } from "../deck/deck";
import { invalidateDeckStatsCache } from "../deck/deckStatsCacheManager";
import { NoteType } from "../note/note";
import { Card } from "./card";

/**
 * This function creates a new card in the database.
 *
 * **Side effects:** It also updates the deck to include the new card.
 */

export async function newCard(card: Card<NoteType>, deck: Deck) {
  card.deck = deck.id;
  // The deck's list is read inside the transaction rather than taken from
  // `deck`, which can be a read-only object from the database cache.
  await db.transaction("rw", db.decks, db.cards, async () => {
    await db.cards.add(card, card.id);
    const fresh = await db.decks.get(deck.id);
    await db.decks.update(deck.id, {
      cards: [...(fresh?.cards ?? []), card.id],
    });
  });

  await invalidateDeckStatsCache(deck.id);
  return card.id;
}
