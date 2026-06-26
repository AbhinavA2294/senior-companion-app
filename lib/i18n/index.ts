export { LanguageProvider, useTranslation } from "./context";
export type { SupportedLocale } from "./context";
// getServerTranslation must be imported directly from "@/lib/i18n/server" in Server Components.
// Do NOT re-export it here — next/headers cannot be bundled into Client Components.
