"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolved: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "gdm-send-theme";

function applyTheme(resolved: "light" | "dark") {
  document.documentElement.dataset.theme = resolved;
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null);
    const initial = stored && ["light", "dark", "system"].includes(stored)
      ? stored
      : "system";
    setModeState(initial);
  }, []);

  useEffect(() => {
    const sys = getSystemTheme();
    const next = mode === "system" ? sys : mode;
    setResolved(next);
    applyTheme(next);

    if (mode === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = (e: MediaQueryListEvent) => {
        const r = e.matches ? "dark" : "light";
        setResolved(r);
        applyTheme(r);
      };
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
