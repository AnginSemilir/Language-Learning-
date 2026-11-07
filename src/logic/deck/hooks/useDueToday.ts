import { getCardsOf } from "@/logic/card/getCardsOf";
import { buildDailyQueue } from "@/logic/dailyQueue";
import type { Deck } from "@/logic/deck/deck";
import { getDailyLimits } from "@/logic/settings/dailyLimits";
import { useLiveQuery } from "dexie-react-hooks";

/** Cards to study today across your decks, and the deck with the most. */
export function useDueToday(decks: Deck[] | undefined) {
  return useLiveQuery(async () => {
    if (!decks) return undefined;
    const limits = await getDailyLimits();
    let total = 0;
    let top: { deck: Deck; count: number } | undefined;
    for (const deck of decks) {
      const queue = buildDailyQueue((await getCardsOf(deck)) ?? [], limits);
      const count =
        queue.newCards.length + queue.reviews.length + queue.learning.length;
      total += count;
      if (count > (top?.count ?? 0)) top = { deck, count };
    }
    return { total, deck: top?.deck };
  }, [decks]);
}
