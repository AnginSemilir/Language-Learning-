import { db } from "../db";
import { Deck } from "../deck/deck";
import { NoteType } from "../note/note";
import { Card } from "./card";

export async function newCards(cards: Card<NoteType>[], deck: Deck) {
  for (const card of cards) card.deck = deck.id;
  // The deck's list is read inside the transaction rather than taken from
  // `deck`, which can be a read-only object from the database cache.
  return db.transaction("rw", db.decks, db.cards, async () => {
    await db.cards.bulkAdd(cards);
    const fresh = await db.decks.get(deck.id);
    await db.decks.update(deck.id, {
      cards: [...(fresh?.cards ?? []), ...cards.map((card) => card.id)],
    });
  });
}
