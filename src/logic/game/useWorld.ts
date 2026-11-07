import { getAllDailyStats, todayKey } from "@/lector/data-layer";
import { getKnownWords } from "@/lector/knownWords";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { type WorldState, buildWorld } from "./world";

/** The island as it stands now. It updates as you study, on any device. */
export function useWorld(): WorldState | undefined {
  return useLiveQuery(async () => {
    const [daily, cards, known] = await Promise.all([
      getAllDailyStats(),
      db.cards.toArray(),
      getKnownWords(),
    ]);
    return buildWorld({
      daily,
      cards,
      knownWords: known.length,
      today: todayKey(),
      now: new Date(),
      dayKeyOf: todayKey,
    });
  }, []);
}
