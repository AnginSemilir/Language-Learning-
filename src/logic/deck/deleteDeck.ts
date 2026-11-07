import { db } from "../db";
import { Deck } from "./deck";
import { invalidateDeckStatsCache } from "./deckStatsCacheManager";
import { getDeck } from "./getDeck";

export async function deleteDeck(deck: Deck, calledRecursively?: boolean) {
  const parentId = deck?.superDecks?.[deck.superDecks.length - 1];
  await db.transaction("rw", db.decks, db.cards, db.notes, async () => {
    if (!deck) {
      return;
    }

    await Promise.all(
      deck.subDecks.map((subDeckID) =>
        getDeck(subDeckID).then(
          (subDeck) => subDeck && deleteDeck(subDeck, true)
        )
      )
    );

    if (!calledRecursively && parentId) {
      const superDeck = await getDeck(parentId);
      if (superDeck) {
        await db.decks.update(superDeck.id, {
          subDecks: superDeck.subDecks.filter((s) => s !== deck.id),
        });
      }
    }

    await Promise.all(deck.cards.map((cardID) => db.cards.delete(cardID)));
    await Promise.all(deck.notes.map((noteID) => db.notes.delete(noteID)));
    await db.decks.delete(deck.id);
  });
  // The deck it was in shows its counts without the deleted cards.
  if (!calledRecursively && parentId) await invalidateDeckStatsCache(parentId);
}
