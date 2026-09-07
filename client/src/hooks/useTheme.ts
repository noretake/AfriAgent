import { useCallback, useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "afriagent-theme";
const listeners = new Set<() => void>();

function readTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

let current: Theme = readTheme();

function applyTheme(theme: Theme, animate: boolean) {
  const root = document.documentElement;
  if (animate) root.classList.add("theme-transition");
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  if (animate) window.setTimeout(() => root.classList.remove("theme-transition"), 500);
}

applyTheme(current, false);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current);

  const toggle = useCallback(() => {
    current = current === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, current);
    applyTheme(current, true);
    listeners.forEach((l) => l());
  }, []);

  return { theme, toggle };
}
