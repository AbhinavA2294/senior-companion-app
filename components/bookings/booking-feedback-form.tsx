"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitBookingFeedback } from "@/lib/actions/feedback";
import { Star } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 rounded"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
        >
          <Star
            className={`h-8 w-8 transition-colors ${
              n <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function YesNoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="flex gap-3">
        {[true, false].map((opt) => (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-5 py-2 rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 ${
              value === opt
                ? "bg-sage-600 text-white border-sage-600"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {opt ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BookingFeedbackForm({
  bookingId,
  redirectTo,
}: {
  bookingId: string;
  redirectTo: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [punctual, setPunctual] = useState<boolean | null>(null);
  const [feltSafe, setFeltSafe] = useState<boolean | null>(null);
  const [wouldRebook, setWouldRebook] = useState<boolean | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError("Please select a star rating."); return; }
    if (punctual === null) { setError("Please answer whether the companion was on time."); return; }
    if (feltSafe === null) { setError("Please answer whether you felt safe."); return; }
    if (wouldRebook === null) { setError("Please answer whether you would book again."); return; }

    setError("");
    startTransition(async () => {
      const result = await submitBookingFeedback({
        booking_id: bookingId,
        overall_rating: rating,
        companion_punctual: punctual,
        felt_safe: feltSafe,
        would_rebook: wouldRebook,
        feedback_text: text,
      });
      if (result.success) {
        router.push(redirectTo + "?feedback=submitted");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Star rating */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Overall experience <span className="text-red-500">*</span>
        </label>
        <StarRating value={rating} onChange={setRating} />
        {rating > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            {["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]}
          </p>
        )}
      </div>

      {/* Yes/No questions */}
      <YesNoField
        label="Was the companion on time? *"
        value={punctual}
        onChange={setPunctual}
      />
      <YesNoField
        label="Did you feel safe throughout the visit? *"
        value={feltSafe}
        onChange={setFeltSafe}
      />
      <YesNoField
        label="Would you book this companion again? *"
        value={wouldRebook}
        onChange={setWouldRebook}
      />

      {/* Open text */}
      <div>
        <label htmlFor="feedback-text" className="block text-sm font-medium text-gray-700 mb-1">
          Any additional comments? (optional)
        </label>
        <textarea
          id="feedback-text"
          rows={4}
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell us about your experience…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">{text.length}/1000</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-sage-600 hover:bg-sage-700 text-white"
      >
        {isPending ? "Submitting…" : "Submit Feedback"}
      </Button>

      <p className="text-xs text-gray-400 text-center leading-relaxed">
        Your feedback helps us improve the pilot program and is shared with our admin team only.
        It will not be shown publicly.
      </p>
    </form>
  );
}
