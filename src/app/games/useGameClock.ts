import { useEffect, useRef, useState } from "react";

/**
 * A game's countdown. It stops while the app is in the background (a phone
 * call, another tab) and can be given or docked time.
 */
export function useGameClock(durationMs: number) {
  const endsAt = useRef(0);
  const pausedAt = useRef<number | null>(null);
  const [left, setLeft] = useState(durationMs);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    endsAt.current = Date.now() + durationMs;
    pausedAt.current = null;
    const timer = setInterval(() => {
      if (pausedAt.current !== null) return;
      setLeft(Math.max(0, endsAt.current - Date.now()));
    }, 100);
    const onVisibility = () => {
      if (document.hidden) {
        pausedAt.current = Date.now();
        setPaused(true);
      } else if (pausedAt.current !== null) {
        endsAt.current += Date.now() - pausedAt.current;
        pausedAt.current = null;
        setPaused(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [durationMs]);

  const add = (ms: number) => {
    endsAt.current += ms;
    setLeft(Math.max(0, endsAt.current - Date.now()));
  };

  return { left, paused, add };
}
