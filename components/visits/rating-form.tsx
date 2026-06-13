"use client";

import { useState, useTransition } from "react";
import { submitRating } from "@/lib/actions/visit-lifecycle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Star, AlertTriangle, CheckCircle } from "lucide-react";

interface Props {
  bookingId: string;
  companionProfileId: string;
  companionName: string;
  onSuccess?: () => void;
}

export function RatingForm({ bookingId, companionProfileId, companionName, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (!rating) return;
    setServerError(null);
    startTransition(async () => {
      const result = await submitRating({ bookingId, ratedProfileId: companionProfileId, rating, comment: comment || "" });
      if (result.success) { setSubmitted(true); onSuccess?.(); } else { setServerError(result.error); }
    });
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle className="h-9 w-9 text-sage-500" />
        <p className="font-semibold text-gray-900">Thank you for your rating!</p>
        <p className="text-sm text-gray-500">Your feedback helps us maintain great companions.</p>
      </div>
    );
  }

  const display = hovered || rating;

  return (
    <div className="space-y-4">
      <p className="font-medium text-gray-800 text-sm mb-3">How was your visit with {companionName}?</p>
      <div className="flex gap-1" role="group" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" onClick={() => setRating(star)} onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)} aria-label={`${star} star${star !== 1 ? "s" : ""}`} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded">
            <Star className={`h-8 w-8 transition-colors ${star <= display ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
          </button>
        ))}
      </div>
      {display > 0 && <p className="text-xs text-gray-500">{["", "Poor", "Fair", "Good", "Very good", "Excellent"][display]}</p>}

      {serverError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <p>{serverError}</p>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="rating-comment">Comment (optional)</Label>
        <Textarea id="rating-comment" rows={3} maxLength={500} placeholder="Share a brief note about the visit…" value={comment} onChange={(e) => setComment(e.target.value)} />
        <p className="text-xs text-gray-400 text-right">{comment.length}/500</p>
      </div>

      <Button onClick={handleSubmit} disabled={isPending || rating === 0} size="lg" className="flex items-center gap-2">
        <Star className="h-4 w-4" aria-hidden="true" />
        {isPending ? "Submitting…" : "Submit Rating"}
      </Button>
    </div>
  );
}