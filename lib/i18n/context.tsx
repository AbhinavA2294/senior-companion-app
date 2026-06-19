"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import en from "./translations/en.json";
import es from "./translations/es.json";
import hi from "./translations/hi.json";
import ta from "./translations/ta.json";

export type SupportedLocale = "en" | "es" | "hi" | "ta";

const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  es: "Español",
  hi: "हिन्दी",
  ta: "தமிழ்",
};

const TRANSLATIONS: Record<SupportedLocale, Record<string, unknown>> = { en, es, hi, ta };

const STORAGE_KEY = "sc_ui_locale";

function getNestedValue(obj: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return key;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : key;
}

interface LanguageContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string) => string;
  localeLabels: Record<SupportedLocale, string>;
  supportedLocales: SupportedLocale[];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
    if (stored && stored in TRANSLATIONS) {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((next: SupportedLocale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: string) => getNestedValue(TRANSLATIONS[locale] as Record<string, unknown>, key),
    [locale]
  );

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        t,
        localeLabels: LOCALE_LABELS,
        supportedLocales: ["en", "es", "hi", "ta"],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used inside LanguageProvider");
  return ctx;
}
