"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n";
import type { SupportedLocale } from "@/lib/i18n";
import { Globe } from "lucide-react";

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, localeLabels, supportedLocales } = useTranslation();

  return (
    <div className="relative flex items-center gap-1.5">
      {!compact && <Globe className="h-4 w-4 text-gray-400" aria-hidden="true" />}
      <label htmlFor="language-select" className="sr-only">
        Display language
      </label>
      <select
        id="language-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as SupportedLocale)}
        className="h-9 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sage-500 cursor-pointer"
        aria-label="Select display language"
      >
        {supportedLocales.map((loc) => (
          <option key={loc} value={loc}>
            {localeLabels[loc]}
          </option>
        ))}
      </select>
    </div>
  );
}
