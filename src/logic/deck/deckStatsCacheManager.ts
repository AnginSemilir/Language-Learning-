import { State } from "fsrs.js";
import { Card } from "../card/card";
import { SimplifiedState } from "../card/getSimplifiedStatesOf";
import { buildDailyQueue } from "../dailyQueue";
import { db } from "../db";
import { NoteType } from "../note/note";
import { getDailyLimits } from "../settings/dailyLimits";
import getSetting from "../settings/hooks/getSetting";
import { Deck, DeckStatCache } from "./deck";

function getStartOfDay(date: Date, rolloverHour: number): Date {
  const result = new Date(date);
  result.setHours(rolloverHour, 0, 0, 0);

  if (date.getHours() < rolloverHour) {
    result.setDate(result.getDate() - 1);
  }

  return result;
}

async function isCacheValid(
  cache: DeckStatCache | undefined
): Promise<boolean> {
  if (!cache) return false;

  const now = new Date();
  const lastUpdated = new Date(cache.lastUpdated);

  const rolloverHour = await getSetting("#newDayStartHour");

  const currentDayStart = getStartOfDay(now, rolloverHour);
  const cacheDayStart = getStartOfDay(lastUpdated, rolloverHour);

  if (currentDayStart.getTime() !== cacheDayStart.getTime()) {
    return false;
  }

  // Changing the daily limits changes the counts.
  return cache.limitsKey === JSON.stringify(await getDailyLimits());
}

async function computeStatCounts(
  deck: Deck,
  includeSubdecks = true
): Promise<Record<SimplifiedState, number>> {
  const counts = {
    new: 0,
    learning: 0,
    review: 0,
    notDue: 0,
  };

  const now = new Date();
  const cardIds = new Set<string>();

  const collectCardIds = async (currentDeck: Deck): Promise<void> => {
    currentDeck.cards.forEach((id) => cardIds.add(id));

    if (includeSubdecks) {
      await Promise.all(
        currentDeck.subDecks.map(async (subDeckId) => {
          const subDeck = await db.decks.get(subDeckId);
          if (subDeck) {
            await collectCardIds(subDeck);
          }
        })
      );
    }
  };

  await collectCardIds(deck);

  const cards: Card<NoteType>[] = await db.cards
    .where("id")
    .anyOf(Array.from(cardIds))
    .toArray();
  // New and review counts are what today's session offers (Anki's daily limits).
  const queue = buildDailyQueue(cards, await getDailyLimits(), now);
  counts.new = queue.newCards.length;
  counts.learning = queue.learning.length;
  counts.review = queue.reviews.length;
  counts.notDue = cards.filter(
    (card) => card.model.state === State.Review && card.model.due > now
  ).length;

  return counts;
}

export async function getOrComputeDeckStats(
  deck: Deck,
  includeSubdecks = true
): Promise<Record<SimplifiedState, number>> {
  if (
    (await isCacheValid(deck.statCache)) &&
    deck.statCache!.includesSubdecks === includeSubdecks
  ) {
    return deck.statCache!.counts;
  }

  const counts = await computeStatCounts(deck, includeSubdecks);

  await db.decks.update(deck.id, {
    statCache: {
      counts,
      lastUpdated: new Date(),
      includesSubdecks: includeSubdecks,
      limitsKey: JSON.stringify(await getDailyLimits()),
    },
  });

  return counts;
}

export async function invalidateDeckStatsCache(deckId: string): Promise<void> {
  const deck = await db.decks.get(deckId);
  if (!deck) return;

  await db.decks.update(deckId, {
    statCache: undefined,
  });

  if (deck.superDecks && deck.superDecks.length > 0) {
    await Promise.all(
      deck.superDecks.map((superDeckId) =>
        invalidateDeckStatsCache(superDeckId)
      )
    );
  }
}

export async function invalidateDeckStatsCacheForCard(
  cardId: string
): Promise<void> {
  const card = await db.cards.get(cardId);
  if (!card) return;

  await invalidateDeckStatsCache(card.deck);
}

export async function recomputeAllDeckStats(): Promise<void> {
  const decks = await db.decks.toArray();
  await Promise.all(
    decks.map(async (deck) => {
      const counts = await computeStatCounts(deck, true);
      await db.decks.update(deck.id, {
        statCache: {
          counts,
          lastUpdated: new Date(),
          includesSubdecks: true,
          limitsKey: JSON.stringify(await getDailyLimits()),
        },
      });
    })
  );
}
