import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useEffect } from "react";
import { useSetting } from "../logic/settings/hooks/useSetting";
import { setSetting } from "../logic/settings/setSetting";

type ColorScheme = "light" | "dark" | "auto";
const STORAGE_KEY = "mantine-color-scheme-value";

/** The page background of each theme, for the browser and phone status bar. */
const THEME_COLOR = { light: "#f9f7f3", dark: "#151412" };

function resolvedTheme(preference: ColorScheme): "light" | "dark" {
  if (preference !== "auto") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemeFromPreference(preference: ColorScheme) {
  const theme = resolvedTheme(preference);
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", THEME_COLOR[theme]);
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

/** The preference saved on this device, read safely (storage may be blocked). */
function storedPreference(): ColorScheme {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    return parsed === "light" || parsed === "dark" ? parsed : "auto";
  } catch {
    return "auto";
  }
}

// Apply theme immediately on module load to prevent flash
applyThemeFromPreference(storedPreference());

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
