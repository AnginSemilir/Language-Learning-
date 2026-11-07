import { type DayPhase, dayPhase } from "@/logic/game/world";
import { useEffect, useState } from "react";

/** Dawn, day, dusk or night on the island, following the clock. */
export function usePhase(): DayPhase {
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const timer = setInterval(() => setHour(new Date().getHours()), 60000);
    return () => clearInterval(timer);
  }, []);
  return dayPhase(hour);
}
