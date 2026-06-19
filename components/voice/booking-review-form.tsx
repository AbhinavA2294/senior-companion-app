"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import type { ExtractedBookingDetails } from "@/lib/voice/types";

export interface ReviewedBookingData {
  seniorProfileId: string;
  activityTypeId: string;
  date: string;
  startTime: string;
  durationHours: number;
  location: string;
  destination: string;
  notes: string;
  disclaimerAcknowledged: boolean;
}

interface Senior {
  id: string;
  firstName: string;
  lastName: string;
}

interface ActivityType {
  id: string;
  name: string;
}

interface BookingReviewFormProps {
  extracted: ExtractedBookingDetails;
  seniors: Senior[];
  activityTypes: ActivityType[];
  defaultSeniorId?: string;
  onSubmit: (data: ReviewedBookingData) => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
}

export function BookingReviewForm({
  extracted,
  seniors,
  activityTypes,
  defaultSeniorId,
  onSubmit,
  onBack,
  isSubmitting,
}: BookingReviewFormProps) {
  const { t } = useTranslation();

  const findActivityTypeId = () => {
    if (!extracted.activityTypeName) return activityTypes[0]?.id ?? "";
    const match = activityTypes.find((a) =>
      a.name.toLowerCase().includes(extracted.activityTypeName!.toLowerCase().split(" ")[0])
    );
    return match?.id ?? activityTypes[0]?.id ?? "";
  };

  const [seniorProfileId, setSeniorProfileId] = useState(defaultSeniorId ?? seniors[0]?.id ?? "");
  const [activityTypeId, setActivityTypeId] = useState(findActivityTypeId);
  const [date, setDate] = useState(extracted.date ?? "");
  const [startTime, setStartTime] = useState(extracted.startTime ?? "");
  const [durationHours, setDurationHours] = useState(String(extracted.durationHours ?? ""));
  const [location, setLocation] = useState(extracted.location ?? "");
  const [destination, setDestination] = useState(extracted.destination ?? "");
  const [notes, setNotes] = useState(extracted.notes ?? "");
  const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disclaimerAcknowledged) {
      setValidationError(t("voice.disclaimerRequired"));
      return;
    }
    if (!date || !startTime || !durationHours) {
      setValidationError("Date, start time, and duration are required.");
      return;
    }
    setValidationError(null);
    await onSubmit({
      seniorProfileId,
      activityTypeId,
      date,
      startTime,
      durationHours: parseFloat(durationHours),
      location,
      destination,
      notes,
      disclaimerAcknowledged: true,
    });
  };

  const fieldClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">{t("voice.reviewSubtitle")}</p>
      </div>

      {/* Medical warning */}
      {extracted.medicalWarningTriggered && (
        <div className="flex gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p>{t("voice.medicalContextNote")}</p>
        </div>
      )}

      {/* Confidence badge */}
      {extracted.confidence === "low" && (
        <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p>Some details could not be extracted automatically. Please fill them in below.</p>
        </div>
      )}

      <div className="grid gap-4">
        {/* Senior */}
        {seniors.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("field.senior")} <span className="text-red-500">*</span>
            </label>
            <select
              value={seniorProfileId}
              onChange={(e) => setSeniorProfileId(e.target.value)}
              className={fieldClass}
              required
            >
              {seniors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Activity type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("field.activityType")} <span className="text-red-500">*</span>
          </label>
          <select
            value={activityTypeId}
            onChange={(e) => setActivityTypeId(e.target.value)}
            className={fieldClass}
            required
          >
            {activityTypes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date + Time row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("field.date")} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={fieldClass}
              min={new Date().toISOString().split("T")[0]}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("field.startTime")} <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={fieldClass}
              required
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("field.duration")} <span className="text-red-500">*</span>
          </label>
          <select
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
            className={fieldClass}
            required
          >
            <option value="">Select duration…</option>
            {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8].map((h) => (
              <option key={h} value={h}>
                {h === 0.5 ? "30 minutes" : h === 1 ? "1 hour" : `${h} hours`}
              </option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("field.location")}</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Home address, or leave blank"
            className={fieldClass}
          />
        </div>

        {/* Destination */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("field.destination")}</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. clinic name and address"
            className={fieldClass}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("field.notes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any additional context (no medical records or diagnoses)"
            className={`${fieldClass} resize-none`}
          />
        </div>
      </div>

      {/* Non-medical disclaimer — REQUIRED */}
      <div className="rounded-xl border border-sage-200 bg-sage-50 p-4 space-y-3">
        <p className="text-sm font-semibold text-sage-800">{t("booking.disclaimerTitle")}</p>
        <p className="text-sm text-sage-700">{t("booking.disclaimer")}</p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={disclaimerAcknowledged}
            onChange={(e) => {
              setDisclaimerAcknowledged(e.target.checked);
              if (e.target.checked) setValidationError(null);
            }}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-sage-600 focus:ring-sage-500 cursor-pointer"
          />
          <span className="text-sm font-medium text-sage-800">{t("voice.disclaimerLabel")}</span>
        </label>
        {validationError && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            {validationError}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          {t("voice.backToInput")}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("common.loading")}
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t("voice.confirmButton")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
