"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { VoiceInput } from "./voice-input";
import { BookingReviewForm } from "./booking-review-form";
import type { ReviewedBookingData } from "./booking-review-form";
import type { ExtractedBookingDetails } from "@/lib/voice/types";
import { mockVoiceProvider } from "@/lib/voice/mock-provider";

interface Senior {
  id: string;
  firstName: string;
  lastName: string;
}

interface ActivityType {
  id: string;
  name: string;
}

interface VoiceBookingWizardProps {
  seniors: Senior[];
  activityTypes: ActivityType[];
  defaultSeniorId?: string;
  successRedirect: string;
  submitAction: (data: ReviewedBookingData) => Promise<{ success: boolean; error?: string; bookingId?: string }>;
}

type Step = "input" | "review" | "success";

export function VoiceBookingWizard({
  seniors,
  activityTypes,
  defaultSeniorId,
  successRedirect,
  submitAction,
}: VoiceBookingWizardProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const [step, setStep] = useState<Step>("input");
  const [extracted, setExtracted] = useState<ExtractedBookingDetails | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  const activityTypeNames = activityTypes.map((a) => a.name);

  const handleExtract = async (text: string) => {
    setIsExtracting(true);
    setExtractError(null);
    try {
      const result = await mockVoiceProvider.extractBookingDetails(text, {
        availableActivityTypes: activityTypeNames,
      });
      setExtracted(result);
      setStep("review");
    } catch {
      setExtractError("Could not extract booking details. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (data: ReviewedBookingData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitAction(data);
      if (result.success) {
        setStep("success");
        setTimeout(() => router.push(successRedirect), 1500);
      } else {
        setSubmitError(result.error ?? "Booking could not be submitted. Please try again.");
      }
    } catch {
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="h-14 w-14 rounded-full bg-sage-100 flex items-center justify-center">
          <span className="text-3xl">✓</span>
        </div>
        <p className="font-display text-xl font-semibold text-gray-900">Booking submitted!</p>
        <p className="text-sm text-gray-500">Redirecting to your bookings…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
            step === "input" ? "bg-sage-600 text-white" : "bg-sage-100 text-sage-700"
          }`}
        >
          1
        </span>
        <span className={step === "input" ? "font-medium text-gray-900" : "text-gray-400"}>
          Describe request
        </span>
        <span className="text-gray-300 mx-1">→</span>
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
            step === "review" ? "bg-sage-600 text-white" : "bg-gray-100 text-gray-400"
          }`}
        >
          2
        </span>
        <span className={step === "review" ? "font-medium text-gray-900" : "text-gray-400"}>
          Review & confirm
        </span>
      </div>

      {step === "input" && (
        <>
          <VoiceInput onExtract={handleExtract} isExtracting={isExtracting} />
          {extractError && (
            <p className="text-sm text-red-600">{extractError}</p>
          )}
        </>
      )}

      {step === "review" && extracted && (
        <>
          <BookingReviewForm
            extracted={extracted}
            seniors={seniors}
            activityTypes={activityTypes}
            defaultSeniorId={defaultSeniorId}
            onSubmit={handleSubmit}
            onBack={() => setStep("input")}
            isSubmitting={isSubmitting}
          />
          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}
        </>
      )}
    </div>
  );
}
