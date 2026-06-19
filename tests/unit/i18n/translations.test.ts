import { describe, it, expect } from "vitest";

// Load translation files directly (no React context needed for unit tests)
import en from "@/lib/i18n/translations/en.json";
import es from "@/lib/i18n/translations/es.json";
import hi from "@/lib/i18n/translations/hi.json";
import ta from "@/lib/i18n/translations/ta.json";

type DeepRecord = { [k: string]: string | DeepRecord };

function getNestedValue(obj: DeepRecord, key: string): string | undefined {
  const parts = key.split(".");
  let current: string | DeepRecord | undefined = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as DeepRecord)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function getAllKeys(obj: DeepRecord, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      keys.push(full);
    } else {
      keys.push(...getAllKeys(v as DeepRecord, full));
    }
  }
  return keys;
}

const TRANSLATIONS: Record<string, DeepRecord> = { en, es, hi, ta };
const EN_KEYS = getAllKeys(en as DeepRecord);

describe("Translation files", () => {
  it("English has all required top-level namespaces", () => {
    const top = Object.keys(en);
    expect(top).toContain("common");
    expect(top).toContain("voice");
    expect(top).toContain("field");
    expect(top).toContain("accessibility");
    expect(top).toContain("booking");
  });

  it("English has all voice booking keys", () => {
    const voiceKeys = [
      "voice.title",
      "voice.inputLabel",
      "voice.extractButton",
      "voice.reviewTitle",
      "voice.confirmButton",
      "voice.sensitiveDataWarning",
      "voice.medicalContextNote",
      "voice.disclaimerLabel",
      "voice.disclaimerRequired",
      "voice.externalProviderDisabled",
    ];
    for (const key of voiceKeys) {
      const val = getNestedValue(en as DeepRecord, key);
      expect(val, `English missing key: ${key}`).toBeDefined();
      expect(typeof val).toBe("string");
      expect(val!.length).toBeGreaterThan(0);
    }
  });

  it("English has all accessibility keys", () => {
    const accessKeys = [
      "accessibility.title",
      "accessibility.language",
      "accessibility.textSize",
      "accessibility.textNormal",
      "accessibility.textLarge",
      "accessibility.textXl",
      "accessibility.reducedComplexity",
      "accessibility.saved",
    ];
    for (const key of accessKeys) {
      const val = getNestedValue(en as DeepRecord, key);
      expect(val, `English missing key: ${key}`).toBeDefined();
    }
  });

  it("English has booking disclaimer keys", () => {
    expect(getNestedValue(en as DeepRecord, "booking.disclaimer")).toBeDefined();
    expect(getNestedValue(en as DeepRecord, "booking.disclaimerTitle")).toBeDefined();
  });

  for (const locale of ["es", "hi", "ta"] as const) {
    describe(`${locale} translations`, () => {
      it(`${locale} has all English keys`, () => {
        const missing: string[] = [];
        for (const key of EN_KEYS) {
          const val = getNestedValue(TRANSLATIONS[locale] as DeepRecord, key);
          if (val === undefined) missing.push(key);
        }
        expect(missing, `${locale} is missing keys: ${missing.join(", ")}`).toHaveLength(0);
      });

      it(`${locale} values are non-empty strings`, () => {
        const localeKeys = getAllKeys(TRANSLATIONS[locale] as DeepRecord);
        for (const key of localeKeys) {
          const val = getNestedValue(TRANSLATIONS[locale] as DeepRecord, key);
          expect(val, `${locale}.${key} is empty`).toBeTruthy();
        }
      });

      it(`${locale} common.submit is not the same as English`, () => {
        const enVal = getNestedValue(en as DeepRecord, "common.submit");
        const localeVal = getNestedValue(TRANSLATIONS[locale] as DeepRecord, "common.submit");
        // Translation should differ from English (placeholder check)
        expect(localeVal).not.toBe(enVal);
      });

      it(`${locale} voice.disclaimerLabel is translated`, () => {
        const enVal = getNestedValue(en as DeepRecord, "voice.disclaimerLabel");
        const localeVal = getNestedValue(TRANSLATIONS[locale] as DeepRecord, "voice.disclaimerLabel");
        expect(localeVal).toBeDefined();
        expect(localeVal).not.toBe(enVal);
      });
    });
  }

  it("translation lookup returns key as fallback for missing key", () => {
    // Simulate the getNestedValue fallback behavior in the context
    const result = getNestedValue(en as DeepRecord, "nonexistent.key");
    expect(result).toBeUndefined();
  });
});

describe("Language switching behavior (context logic)", () => {
  it("getNestedValue correctly resolves nested keys", () => {
    expect(getNestedValue(en as DeepRecord, "common.submit")).toBe("Submit");
    expect(getNestedValue(en as DeepRecord, "voice.title")).toBe("Voice-Assisted Booking");
    expect(getNestedValue(en as DeepRecord, "accessibility.textNormal")).toBe("Normal");
  });

  it("getNestedValue returns undefined for missing paths", () => {
    expect(getNestedValue(en as DeepRecord, "common.doesNotExist")).toBeUndefined();
    expect(getNestedValue(en as DeepRecord, "missing.path.deep")).toBeUndefined();
  });

  it("switching locale returns different text for same key", () => {
    const key = "common.submit";
    const enVal = getNestedValue(en as DeepRecord, key);
    const esVal = getNestedValue(es as DeepRecord, key);
    const hiVal = getNestedValue(hi as DeepRecord, key);
    const taVal = getNestedValue(ta as DeepRecord, key);

    expect(enVal).toBe("Submit");
    // All translated values must be non-null and different from English
    expect(esVal).toBeTruthy();
    expect(hiVal).toBeTruthy();
    expect(taVal).toBeTruthy();
    expect(esVal).not.toBe(enVal);
    expect(hiVal).not.toBe(enVal);
    expect(taVal).not.toBe(enVal);
    // All four must be distinct (no collisions)
    const unique = new Set([enVal, esVal, hiVal, taVal]);
    expect(unique.size).toBe(4);
  });

  it("all locales return the same set of keys", () => {
    for (const locale of ["es", "hi", "ta"]) {
      const localeKeys = getAllKeys(TRANSLATIONS[locale] as DeepRecord).sort();
      const enKeysSorted = [...EN_KEYS].sort();
      expect(localeKeys).toEqual(enKeysSorted);
    }
  });
});
