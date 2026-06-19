"use server";

import { createBooking } from "@/lib/actions/bookings";
import type { ReviewedBookingData } from "@/components/voice/booking-review-form";

export async function submitVoiceBooking(
  data: ReviewedBookingData
): Promise<{ success: boolean; error?: string; bookingId?: string }> {
  return createBooking({
    senior_profile_id: data.seniorProfileId,
    activity_type_id: data.activityTypeId,
    scheduled_date: data.date,
    scheduled_start_time: data.startTime,
    duration_hours: data.durationHours,
    location_description: data.location || "To be confirmed",
    destination_address: data.destination || undefined,
    special_notes: data.notes || undefined,
    disclaimer_acknowledged: true as const,
  });
}
