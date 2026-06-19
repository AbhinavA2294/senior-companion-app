"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useAccessibility, type TextSize } from "@/components/accessibility/accessibility-provider";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TEXT_SIZES: { value: TextSize; labelKey: string; fontSize: string }[] = [
  { value: "normal", labelKey: "accessibility.textNormal", fontSize: "16px" },
  { value: "large", labelKey: "accessibility.textLarge", fontSize: "19px" },
  { value: "xl", labelKey: "accessibility.textXl", fontSize: "22px" },
];

export function AccessibilitySettingsPage() {
  const { t } = useTranslation();
  const { textSize, setTextSize, reducedComplexity, setReducedComplexity } = useAccessibility();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setTextSize("normal");
    setReducedComplexity(false);
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900">{t("accessibility.title")}</h1>
        <p className="text-senior-base text-gray-500 mt-1">{t("accessibility.subtitle")}</p>
      </div>

      {/* Language */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-senior-lg">{t("accessibility.language")}</CardTitle>
          <p className="text-sm text-gray-500">{t("accessibility.languageHint")}</p>
        </CardHeader>
        <CardContent>
          <LanguageSelector />
        </CardContent>
      </Card>

      {/* Text size */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-senior-lg">{t("accessibility.textSize")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {TEXT_SIZES.map(({ value, labelKey, fontSize }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTextSize(value)}
                className={`rounded-xl border-2 px-3 py-3 text-center transition-all focus:outline-none focus:ring-2 focus:ring-sage-500 ${
                  textSize === value
                    ? "border-sage-500 bg-sage-50 text-sage-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-sage-200"
                }`}
              >
                <span style={{ fontSize }} className="block font-semibold leading-tight">
                  Aa
                </span>
                <span className="mt-1 block text-xs">{t(labelKey)}</span>
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
            <p className="text-sm text-gray-500 mb-1">Preview:</p>
            <p className="text-gray-800">{t("accessibility.textPreview")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Reduced complexity */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={reducedComplexity}
              onChange={(e) => setReducedComplexity(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-gray-300 text-sage-600 focus:ring-sage-500 cursor-pointer"
            />
            <div>
              <span className="block font-medium text-gray-900 text-senior-base">
                {t("accessibility.reducedComplexity")}
              </span>
              <span className="block text-sm text-gray-500 mt-0.5">
                {t("accessibility.reducedComplexityHint")}
              </span>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave}>
          {saved ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {t("accessibility.saved")}
            </>
          ) : (
            t("common.save")
          )}
        </Button>
        <Button variant="ghost" onClick={handleReset} className="text-gray-500">
          {t("accessibility.resetDefaults")}
        </Button>
      </div>
    </div>
  );
}
