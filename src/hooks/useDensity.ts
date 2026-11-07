import { useEffect } from "react";
import { useSetting } from "../logic/settings/hooks/useSetting";

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;

  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
  );
}

function applyDensityFromPreference(
  preference: "relaxed" | "compact" | "auto"
) {
  const root = document.documentElement;

  if (preference === "auto") {
    const isTouch = isTouchDevice();
    if (isTouch) {
      root.removeAttribute("data-density");
    } else {
      root.setAttribute("data-density", "compact");
    }
  } else if (preference === "compact") {
    root.setAttribute("data-density", "compact");
  } else {
    root.removeAttribute("data-density");
  }
}

const STORAGE_KEY = "settings-densityPreference";

/** The preference saved on this device, read safely (storage may be blocked). */
function storedPreference(): "relaxed" | "compact" | "auto" {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    return parsed === "relaxed" || parsed === "compact" ? parsed : "auto";
  } catch {
    return "auto";
  }
}

// Applied at once on start-up, so the layout doesn't jump once settings load.
if (typeof window !== "undefined") {
  applyDensityFromPreference(storedPreference());
}

export function useDensity() {
  const [densityPreference, isReady] = useSetting("#densityPreference");

  useEffect(() => {
    applyDensityFromPreference(densityPreference);
    if (isReady) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(densityPreference));
      } catch {
        // Only used to avoid a jump on start-up.
      }
    }

    if (densityPreference === "auto") {
      const handleResize = () => applyDensityFromPreference(densityPreference);
      window.addEventListener("resize", handleResize);

      return () => window.removeEventListener("resize", handleResize);
    }
  }, [densityPreference, isReady]);
}
