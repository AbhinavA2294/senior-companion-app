"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Loader2, AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

interface VoiceInputProps {
  onExtract: (text: string) => Promise<void>;
  isExtracting: boolean;
}

// SpeechRecognition type shim for browsers that support it
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

const EXAMPLE_REQUEST =
  "I need someone to accompany my mother to her eye doctor appointment next Wednesday at 10 AM for about two hours.";

export function VoiceInput({ onExtract, isExtracting }: VoiceInputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setSpeechSupported(!!SR);
  }, []);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await onExtract(text.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Sensitive data warning */}
      <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p>{t("voice.sensitiveDataWarning")}</p>
      </div>

      <div>
        <label htmlFor="voice-input" className="block text-sm font-medium text-gray-700 mb-1.5">
          {t("voice.inputLabel")}
        </label>
        <div className="relative">
          <textarea
            id="voice-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("voice.inputPlaceholder")}
            rows={4}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sage-500 resize-none"
            disabled={isListening || isExtracting}
          />
          {isListening && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              {t("voice.listening")}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {speechSupported && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={isListening ? stopListening : startListening}
            disabled={isExtracting}
            className={isListening ? "border-red-300 text-red-600 hover:bg-red-50" : ""}
          >
            {isListening ? (
              <>
                <MicOff className="h-4 w-4 mr-1.5" />
                {t("voice.micStop")}
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-1.5" />
                {t("voice.micButton")}
              </>
            )}
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setText(EXAMPLE_REQUEST)}
          disabled={isListening || isExtracting}
          className="text-gray-500"
        >
          {t("voice.tryExample")}
        </Button>
      </div>

      <Button
        type="submit"
        disabled={!text.trim() || isListening || isExtracting}
        className="w-full"
      >
        {isExtracting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {t("voice.processingLabel")}
          </>
        ) : (
          t("voice.extractButton")
        )}
      </Button>

      {/* Privacy note */}
      <p className="text-xs text-gray-400 text-center">{t("voice.externalProviderDisabled")}</p>
    </form>
  );
}
