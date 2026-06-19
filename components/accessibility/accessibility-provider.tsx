"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type TextSize = "normal" | "large" | "xl";

interface AccessibilityContextValue {
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  reducedComplexity: boolean;
  setReducedComplexity: (enabled: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

const TEXT_SIZE_KEY = "sc_text_size";
const REDUCED_KEY = "sc_reduced_complexity";

const FONT_SIZE: Record<TextSize, string> = {
  normal: "16px",
  large: "19px",
  xl: "22px",
};

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSizeState] = useState<TextSize>("normal");
  const [reducedComplexity, setReducedComplexityState] = useState(false);

  useEffect(() => {
    const storedSize = localStorage.getItem(TEXT_SIZE_KEY) as TextSize | null;
    if (storedSize && storedSize in FONT_SIZE) setTextSizeState(storedSize);
    const storedReduced = localStorage.getItem(REDUCED_KEY);
    if (storedReduced === "true") setReducedComplexityState(true);
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZE[textSize];
    document.documentElement.setAttribute("data-text-size", textSize);
  }, [textSize]);

  const setTextSize = useCallback((size: TextSize) => {
    setTextSizeState(size);
    localStorage.setItem(TEXT_SIZE_KEY, size);
  }, []);

  const setReducedComplexity = useCallback((enabled: boolean) => {
    setReducedComplexityState(enabled);
    localStorage.setItem(REDUCED_KEY, String(enabled));
  }, []);

  return (
    <AccessibilityContext.Provider value={{ textSize, setTextSize, reducedComplexity, setReducedComplexity }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used inside AccessibilityProvider");
  return ctx;
}
