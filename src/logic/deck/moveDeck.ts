import { db } from "../db";
import { Deck } from "./deck";
import { invalidateDeckStatsCache } from "./deckStatsCacheManager";

/** Whether `candidate` is `deck` itself or one of the decks inside it. */
export function isSelfOrDescendant(candidate: Deck, deckId: string): boolean {
  return candidate.id === deckId || !!candidate.superDecks?.includes(deckId);
}

/**
 * Moves a deck (with everything inside it) into another deck.
 *
 * A deck can't go inside itself or one of its own sub-decks: that would make
 * a loop, and listing its cards would never end. Moving it to the deck it is
 * already in does nothing. The deck and its sub-decks get their new chain of
 * parent decks, and the old and new parents' counts are worked out again.
 */
export async function moveDeck(deckId: string, newSuperDeckId: string) {
  const oldSuperDeckId = await db.transaction("rw", db.decks, async () => {
    const deck = await db.decks.get(deckId);
    if (!deck) {
      throw new Error(`Deck with id ${deckId} not found`);
    }
    const newSuperDeck = await db.decks.get(newSuperDeckId);
    if (!newSuperDeck) {
      throw new Error(`Deck with id ${newSuperDeckId} not found`);
    }
    if (isSelfOrDescendant(newSuperDeck, deckId)) {
      throw new Error("A deck can't be moved into itself or its sub-decks");
    }

    const oldParentId = deck.superDecks?.[deck.superDecks.length - 1];
    if (oldParentId === newSuperDeckId) return undefined;

    if (oldParentId) {
      const oldParent = await db.decks.get(oldParentId);
      if (oldParent) {
        await db.decks.update(oldParent.id, {
          subDecks: oldParent.subDecks.filter((id) => id !== deckId),
        });
      }
    }
    if (!newSuperDeck.subDecks.includes(deckId)) {
      await db.decks.update(newSuperDeck.id, {
        subDecks: [...newSuperDeck.subDecks, deckId],
      });
    }

    // Every deck inside the moved one keeps its path below it and gets the
    // new path above it.
    const above = [...(newSuperDeck.superDecks ?? []), newSuperDeckId];
    const oldDepth = deck.superDecks?.length ?? 0;
    const seen = new Set<string>();
    const queue: Deck[] = [deck];
    while (queue.length > 0) {
      const current = queue.shift() as Deck;
      if (seen.has(current.id)) continue;
      seen.add(current.id);
      await db.decks.update(current.id, {
        superDecks: [...above, ...(current.superDecks ?? []).slice(oldDepth)],
      });
      const children = await db.decks.bulkGet(current.subDecks ?? []);
      for (const child of children) if (child) queue.push(child);
    }
    return oldParentId;
  });

  if (oldSuperDeckId) await invalidateDeckStatsCache(oldSuperDeckId);
  await invalidateDeckStatsCache(deckId);
}
