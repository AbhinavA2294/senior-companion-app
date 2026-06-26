"use client";

import { useState } from "react";
import { Star, PlusCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SeniorRatingsClient({ profileId, ratings, reviewableBookings }: {
  profileId: string;
  ratings: any[];
  reviewableBookings: any[];
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function openModal(booking: any) {
    setSelectedBooking(booking);
    setRating(0);
    setComment("");
    setError("");
    setShowModal(true);
  }

  async function submitReview() {
    if (rating === 0) { setError("Please select a star rating."); return; }
    setSubmitting(true);
    const supabase = createClient();
    const companionProfile = selectedBooking.companion_profiles;
    const ratedProfileId = companionProfile?.profiles?.id ?? companionProfile?.profile_id;

    const { error: err } = await supabase.from("ratings").insert({
      booking_id: selectedBooking.id,
      rated_by_profile_id: profileId,
      rated_profile_id: ratedProfileId,
      rating,
      comment: comment.trim() || null,
    });

    setSubmitting(false);
    if (err) { setError(err.message); return; }
    setShowModal(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
          <p className="text-gray-500 mt-1">Reviews you have left for companions</p>
        </div>
        {reviewableBookings.length > 0 && (
          <button
            onClick={() => openModal(reviewableBookings[0])}
            className="flex items-center gap-2 bg-sage-600 hover:bg-sage-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Leave a Review
          </button>
        )}
      </div>

      {reviewableBookings.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Awaiting your review</h2>
          {reviewableBookings.map((b) => {
            const cp = b.companion_profiles;
            const p = cp?.profiles;
            const name = p ? `${p.first_name} ${p.last_name}` : "Companion";
            const date = b.scheduled_start_time
              ? new Date(b.scheduled_start_time).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
              : "Unknown date";
            return (
              <div key={b.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{name}</p>
                  <p className="text-sm text-gray-500">{date}</p>
                </div>
                <button
                  onClick={() => openModal(b)}
                  className="text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors"
                >
                  Rate now →
                </button>
              </div>
            );
          })}
        </div>
      )}

      {ratings.length === 0 && reviewableBookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No reviews yet</h3>
          <p className="text-gray-500">Reviews you leave after bookings will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ratings.map((r) => {
            const companion = r.profiles as any;
            const name = companion ? `${companion.first_name} ${companion.last_name}` : "Companion";
            const date = new Date(r.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{name}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{date}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-5 w-5 ${i < r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="mt-3 text-gray-600 text-sm leading-relaxed">{r.comment}</p>}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Leave a Review</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex justify-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setRating(i + 1)}
                  onMouseEnter={() => setHover(i + 1)}
                  onMouseLeave={() => setHover(0)}
                >
                  <Star className={`h-8 w-8 transition-colors ${i < (hover || rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience (optional)"
              rows={4}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-sage-500"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              onClick={submitReview}
              disabled={submitting}
              className="w-full bg-sage-600 hover:bg-sage-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}