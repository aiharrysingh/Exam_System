import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "examhub.theme";

function systemTheme(): ResolvedTheme {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStored(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  return pref === "system" ? systemTheme() : pref;
}

/**
 * Single source of truth for theming. Always stamps a RESOLVED "light" | "dark"
 * onto <html data-theme> — never "system" and never absent, because the
 * `dark:` custom variant in index.css keys off that exact attribute value.
 */
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(readStored()));

  const apply = useCallback((pref: ThemePreference) => {
    const next = resolveTheme(pref);
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    setResolved(next);
  }, []);

  const setPreference = useCallback(
    (pref: ThemePreference) => {
      setPreferenceState(pref);
      try {
        localStorage.setItem(STORAGE_KEY, pref);
      } catch {
        /* private mode — theme just won't persist */
      }
      apply(pref);
    },
    [apply]
  );

  // Keep in sync when the OS flips and we're following it.
  useEffect(() => {
    apply(preference);
    if (preference !== "system" || typeof matchMedia === "undefined") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference, apply]);

  return { preference, resolved, setPreference };
}
