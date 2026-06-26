import en from "./translations/en.json";
import es from "./translations/es.json";
import hi from "./translations/hi.json";
import ta from "./translations/ta.json";
import zh from "./translations/zh.json";
import ar from "./translations/ar.json";
import bn from "./translations/bn.json";
import pt from "./translations/pt.json";
import ru from "./translations/ru.json";
import ja from "./translations/ja.json";
import pa from "./translations/pa.json";
import mr from "./translations/mr.json";
import te from "./translations/te.json";
import ko from "./translations/ko.json";
import fr from "./translations/fr.json";
import de from "./translations/de.json";
import vi from "./translations/vi.json";
import ur from "./translations/ur.json";
import tr from "./translations/tr.json";
import it from "./translations/it.json";
import nl from "./translations/nl.json";
import uk from "./translations/uk.json";
import gu from "./translations/gu.json";
import kn from "./translations/kn.json";
import ml from "./translations/ml.json";
import pl from "./translations/pl.json";
import sv from "./translations/sv.json";
import no from "./translations/no.json";
import da from "./translations/da.json";
import fi from "./translations/fi.json";
import id from "./translations/id.json";
import ro from "./translations/ro.json";
import th from "./translations/th.json";
import sw from "./translations/sw.json";
import tl from "./translations/tl.json";
import fa from "./translations/fa.json";
import he from "./translations/he.json";
import cs from "./translations/cs.json";
import el from "./translations/el.json";
import bg from "./translations/bg.json";
import or_ from "./translations/or.json";

export type SupportedLocale =
  | "en" | "es" | "hi" | "ta" | "zh" | "ar" | "bn" | "pt"
  | "ru" | "ja" | "pa" | "mr" | "te" | "ko" | "fr" | "de"
  | "vi" | "ur" | "tr" | "it" | "nl" | "uk" | "gu" | "kn" | "ml"
  | "pl" | "sv" | "no" | "da" | "fi" | "id" | "ro" | "th"
  | "sw" | "tl" | "fa" | "he" | "cs" | "el" | "bg" | "or";

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  es: "Spanish",
  ar: "Arabic",
  bn: "Bengali",
  zh: "Chinese",
  nl: "Dutch",
  fr: "French",
  de: "German",
  gu: "Gujarati",
  hi: "Hindi",
  it: "Italian",
  ja: "Japanese",
  kn: "Kannada",
  ko: "Korean",
  ml: "Malayalam",
  mr: "Marathi",
  pt: "Portuguese",
  pa: "Punjabi",
  ru: "Russian",
  ta: "Tamil",
  te: "Telugu",
  tr: "Turkish",
  uk: "Ukrainian",
  ur: "Urdu",
  vi: "Vietnamese",
  pl: "Polish",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
  fi: "Finnish",
  id: "Indonesian",
  ro: "Romanian",
  th: "Thai",
  sw: "Swahili",
  tl: "Filipino",
  fa: "Persian",
  he: "Hebrew",
  cs: "Czech",
  el: "Greek",
  bg: "Bulgarian",
  or: "Odia",
};

export const SUPPORTED_LOCALES: SupportedLocale[] = [
  "en", "es",
  "ar", "bn", "zh", "nl", "fr", "de", "gu", "hi",
  "it", "ja", "kn", "ko", "ml", "mr", "pt", "pa",
  "ru", "ta", "te", "tr", "uk", "ur", "vi",
  "pl", "sv", "no", "da", "fi", "id", "ro", "th",
  "sw", "tl", "fa", "he", "cs", "el", "bg", "or",
];

export const TRANSLATIONS: Record<string, Record<string, unknown>> = {
  en, es, hi, ta, zh, ar, bn, pt, ru, ja, pa, mr, te, ko, fr, de, vi, ur, tr, it, nl, uk, gu, kn, ml,
  pl, sv, no, da, fi, id, ro, th, sw, tl, fa, he, cs, el, bg, "or": or_,
};

export function getNestedValue(obj: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return key;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : key;
}
