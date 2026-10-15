"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AR } from "./i18n";

export type Theme = "dark" | "light";
export type UiLanguage = "en" | "ar";
type Prefs = {
  theme: Theme;
  language: UiLanguage;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: UiLanguage) => void;
  t: (text: string) => string;
};

const PrefsContext = createContext<Prefs | null>(null);

// Interface preferences are per browser. Generated content language is chosen separately per play.
export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [language, setLanguageState] = useState<UiLanguage>("en");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const storedTheme = localStorage.getItem("revenue-theme");
    const storedLanguage = localStorage.getItem("revenue-ui-language");
    if (storedTheme === "light" || storedTheme === "dark")
      setThemeState(storedTheme);
    if (storedLanguage === "ar" || storedLanguage === "en")
      setLanguageState(storedLanguage);
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.lang = language;
    root.dir = language === "ar" ? "rtl" : "ltr";
  }, [loaded, theme, language]);
  const setTheme = useCallback((value: Theme) => {
    localStorage.setItem("revenue-theme", value);
    setThemeState(value);
  }, []);
  const setLanguage = useCallback((value: UiLanguage) => {
    localStorage.setItem("revenue-ui-language", value);
    setLanguageState(value);
  }, []);
  const t = useCallback(
    (text: string) => (language === "ar" ? (AR[text] ?? text) : text),
    [language],
  );
  const value = useMemo(
    () => ({ theme, language, setTheme, setLanguage, t }),
    [theme, language, setTheme, setLanguage, t],
  );
  return (
    <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
  );
}

export function usePrefs() {
  const prefs = useContext(PrefsContext);
  if (!prefs) throw new Error("usePrefs must be used inside PrefsProvider");
  return prefs;
}
