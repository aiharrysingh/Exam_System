import { useCallback, useState } from "react";

export type ThemePreference = "light" | "dark";

const STORAGE_KEY = "examhub.theme";

function systemTheme(): ThemePreference {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStored(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    // Older builds also stored "system" — treat any unrecognized value as
    // "no explicit choice yet" and fall back to the OS preference once.
    return v === "light" || v === "dark" ? v : systemTheme();
  } catch {
    return systemTheme();
  }
}

/**
 * Single source of truth for theming. Only two states now — no "system"
 * option in the UI — but a brand-new visitor with nothing stored still gets
 * a sensible default from the OS preference on first load.
 *
 * Always stamps <html data-theme> because the `dark:` custom variant in
 * index.css keys off that exact attribute value.
 */
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    document.documentElement.dataset.theme = pref;
    document.documentElement.style.colorScheme = pref;
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      /* private mode — theme just won't persist */
    }
  }, []);

  return { preference, resolved: preference, setPreference };
}
