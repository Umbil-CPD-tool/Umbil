import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { appStorage } from "@/lib/appStorage";
import { darkColors, lightColors, type ColorPalette } from "@/theme/colors";

const THEME_KEY = "umbil_theme";

type ThemeContextValue = {
  isDark: boolean;
  colors: ColorPalette;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    void appStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === "dark") setIsDark(true);
      if (stored === "light") setIsDark(false);
    });
  }, []);

  const setDarkMode = useCallback((dark: boolean) => {
    setIsDark(dark);
    void appStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!isDark);
  }, [isDark, setDarkMode]);

  const value = useMemo(
    () => ({
      isDark,
      colors: isDark ? darkColors : lightColors,
      toggleDarkMode,
      setDarkMode,
    }),
    [isDark, toggleDarkMode, setDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
