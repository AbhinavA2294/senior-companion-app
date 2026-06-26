/**
 * Server-side translation utility.
 * Reads the locale from the sc_ui_locale cookie so Server Components can
 * translate text without the React context.
 *
 * Import ONLY from Server Components, Server Actions, or Route Handlers.
 * next/headers cannot be bundled into Client Components — use the
 * useTranslation() hook from "@/lib/i18n" in Client Components instead.
 */

import { cookies } from "next/headers";
import { TRANSLATIONS, getNestedValue } from "./translations-map";

export type { SupportedLocale } from "./translations-map";

const COOKIE_KEY = "sc_ui_locale";

export function getServerTranslation() {
  const cookieStore = cookies();
  const raw = cookieStore.get(COOKIE_KEY)?.value ?? "en";
  const locale = raw in TRANSLATIONS ? raw : "en";
  const dict = (TRANSLATIONS[locale] ?? TRANSLATIONS["en"]) as Record<string, unknown>;
  const t = (key: string): string => getNestedValue(dict, key);
  return { t, locale };
}
