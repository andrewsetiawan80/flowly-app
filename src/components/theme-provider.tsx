"use client";

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getThemeById, DEFAULT_THEME_ID, type ThemePreset } from "@/lib/themes";

// Accent theme context
interface AccentThemeContextType {
  accentTheme: ThemePreset;
  setAccentTheme: (id: string) => void;
  accentId: string;
}

const AccentThemeContext = createContext<AccentThemeContextType>({
  accentTheme: getThemeById(DEFAULT_THEME_ID),
  setAccentTheme: () => {},
  accentId: DEFAULT_THEME_ID,
});

export function useAccentTheme() {
  return useContext(AccentThemeContext);
}

function AccentThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useNextTheme();
  const [accentId, setAccentId] = useState(DEFAULT_THEME_ID);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("flowly-accent-theme");
    if (stored) setAccentId(stored);
    setMounted(true);
  }, []);

  const applyTheme = useCallback((id: string, mode?: string) => {
    const theme = getThemeById(id);
    const isDark = mode === "dark";
    const values = isDark ? theme.dark : theme.light;
    const root = document.documentElement;

    root.style.setProperty("--primary", values.primary);
    root.style.setProperty("--accent", values.accent);
    root.style.setProperty("--ring", values.ring);
    root.style.setProperty("--accent-rgb", theme.rgb);
    root.style.setProperty("--accent-hex", theme.hex);
  }, []);

  // Apply theme on mount and when accent or dark/light mode changes
  useEffect(() => {
    if (mounted) {
      applyTheme(accentId, resolvedTheme);
    }
  }, [accentId, resolvedTheme, mounted, applyTheme]);

  const setAccentTheme = useCallback((id: string) => {
    setAccentId(id);
    localStorage.setItem("flowly-accent-theme", id);
  }, []);

  const accentTheme = getThemeById(accentId);

  return (
    <AccentThemeContext.Provider value={{ accentTheme, setAccentTheme, accentId }}>
      {children}
    </AccentThemeContext.Provider>
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <AccentThemeProvider>
        {children}
      </AccentThemeProvider>
    </NextThemesProvider>
  );
}
