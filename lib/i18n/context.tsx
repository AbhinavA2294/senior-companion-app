"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  TRANSLATIONS,
  getNestedValue,
} from "./translations-map";

export type { SupportedLocale } from "./translations-map";

const STORAGE_KEY = "sc_ui_locale";
const COOKIE_KEY  = "sc_ui_locale";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

interface LanguageContextValue {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string) => string;
  localeLabels: Record<string, string>;
  supportedLocales: string[];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in TRANSLATIONS) {
      setLocaleState(stored);
      document.cookie = `${COOKIE_KEY}=${stored}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    }
  }, []);

  const setLocale = useCallback(
    (next: string) => {
      if (!(next in TRANSLATIONS)) return;
      setLocaleState(next);
      localStorage.setItem(STORAGE_KEY, next);
      document.cookie = `${COOKIE_KEY}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
      document.documentElement.lang = next;
      router.refresh();
    },
    [router],
  );

  const t = useCallback(
    (key: string) => getNestedValue(TRANSLATIONS[locale] as Record<string, unknown>, key),
    [locale],
  );

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        t,
        localeLabels: LOCALE_LABELS,
        supportedLocales: SUPPORTED_LOCALES,
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
