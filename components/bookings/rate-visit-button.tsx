"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RatingModal } from "@/components/bookings/rating-modal";

interface RateVisitButtonProps {
  bookingId: string;
  ratedByProfileId: string;
  ratedProfileId: string;
}

export function RateVisitButton({ bookingId, ratedByProfileId, ratedProfileId }: RateVisitButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        ⭐ Rate this visit
      </Button>
      {open && (
        <RatingModal
          bookingId={bookingId}
          ratedByProfileId={ratedByProfileId}
          ratedProfileId={ratedProfileId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}