import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useEffect } from "react";
import { useSetting } from "../logic/settings/hooks/useSetting";
import { setSetting } from "../logic/settings/setSetting";

type ColorScheme = "light" | "dark" | "auto";
const STORAGE_KEY = "mantine-color-scheme-value";

function applyThemeFromPreference(preference: "light" | "dark" | "auto") {
  const root = document.documentElement;

  if (preference === "auto") {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    root.setAttribute("data-theme", prefersDark ? "dark" : "light");
  } else {
    root.setAttribute("data-theme", preference);
  }
}

/**
 * Saves the light/dark preference and applies it at once. It is also kept in
 * localStorage, which is read on start-up so the page doesn't flash light.
 */
export function setColorScheme(preference: ColorScheme) {
  applyThemeFromPreference(preference);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // Only used to avoid a flash on start-up.
  }
  return setSetting("#colorSchemePreference", preference);
}

/** Whether the dark theme is showing, whatever the preference. */
export function useIsDark() {
  const [preference] = useSetting("#colorSchemePreference");
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  return preference === "dark" || (preference === "auto" && systemDark);
}

// Apply theme immediately on module load to prevent flash
const storedPreference = localStorage.getItem(STORAGE_KEY);
if (storedPreference) {
  try {
    const parsed = JSON.parse(storedPreference);
    if (parsed && typeof parsed === "string") {
      applyThemeFromPreference(parsed as "light" | "dark" | "auto");
    }
  } catch {
    applyThemeFromPreference("auto");
  }
} else {
  applyThemeFromPreference("auto");
}

export function useTheme() {
  const [colorSchemePreference] = useSetting("#colorSchemePreference");

  useEffect(() => {
    applyThemeFromPreference(colorSchemePreference);

    if (colorSchemePreference === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () =>
        applyThemeFromPreference(colorSchemePreference);

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [colorSchemePreference]);

  return { colorSchemePreference };
}
