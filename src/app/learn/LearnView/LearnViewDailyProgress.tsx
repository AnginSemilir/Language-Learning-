// Today's progress at the top of the review screen: new cards started
// today against the daily limit ("New 11/20"), and every answer given today
// ("Done today 47"). Live: it updates as cards are answered.

import { getCardsOf } from "@/logic/card/getCardsOf";
import { buildDailyQueue } from "@/logic/dailyQueue";
import type { Deck } from "@/logic/deck/deck";
import { getDailyLimits } from "@/logic/settings/dailyLimits";
import { useLiveQuery } from "dexie-react-hooks";
import "./LearnViewDailyProgress.css";

const BASE = "learn-view-daily-progress";

export default function LearnViewDailyProgress({ deck }: { deck?: Deck }) {
  const progress = useLiveQuery(async () => {
    if (!deck) return null;
    const [cards, limits] = await Promise.all([
      getCardsOf(deck),
      getDailyLimits(),
    ]);
    const queue = buildDailyQueue(cards ?? [], limits);
    return {
      newToday: queue.newDoneToday,
      newLimit: limits.newPerDay,
      done: queue.answersToday,
    };
  }, [deck]);

  if (!progress) return null;
  const { newToday, newLimit, done } = progress;
  return (
    <div className={BASE} aria-live="polite">
      <span className={`${BASE}__item`}>
        <span className={`${BASE}__label`}>New today</span>
        <span className={`${BASE}__value`}>
          {newToday}
          <span className={`${BASE}__of`}>/{newLimit}</span>
        </span>
        <span className={`${BASE}__meter`} aria-hidden="true">
          <span
            className={`${BASE}__fill`}
            style={{
              width: `${Math.min(100, newLimit ? (newToday / newLimit) * 100 : 0)}%`,
            }}
          />
        </span>
      </span>
      <span className={`${BASE}__item`}>
        <span className={`${BASE}__label`}>Done today</span>
        <span className={`${BASE}__value`}>{done.toLocaleString()}</span>
      </span>
    </div>
  );
}
