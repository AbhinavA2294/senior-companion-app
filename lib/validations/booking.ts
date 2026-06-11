import { z } from "zod";

export const BOOKING_MIN_HOURS = 2;
export const BOOKING_MAX_HOURS = 6;
export const BOOKING_ADVANCE_HOURS = 12;

// Transportation modes that are allowed.
// Personal vehicle / companion vehicle is intentionally excluded.
export const ALLOWED_TRANSPORT_MODES = [
  "walk",
  "public_transit",
  "rideshare",
  "other",
] as const;

export type AllowedTransportMode = (typeof ALLOWED_TRANSPORT_MODES)[number];

export const BookingSchema = z
  .object({
    senior_profile_id: z.string().uuid("Please select a senior."),
    activity_type_id: z.string().uuid("Please select an activity type."),
    scheduled_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Please select a valid date."),
    scheduled_start_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Please select a valid start time."),
    duration_hours: z
      .number({
        required_error: "Duration is required.",
        invalid_type_error: "Duration must be a number.",
      })
      .min(BOOKING_MIN_HOURS, `Minimum duration is ${BOOKING_MIN_HOURS} hours.`)
      .max(BOOKING_MAX_HOURS, `Maximum duration is ${BOOKING_MAX_HOURS} hours.`),
    location_description: z
      .string()
      .min(5, "Please enter a meeting address.")
      .max(500),
    destination_address: z.string().max(500).optional().or(z.literal("")),
    transportation_mode: z
      .enum(ALLOWED_TRANSPORT_MODES, {
        errorMap: () => ({
          message:
            "Please select a valid transportation method. Note: companion personal-vehicle transport is not available.",
        }),
      })
      .optional(),
    special_notes: z
      .string()
      .max(1000, "Notes must be 1,000 characters or fewer.")
      .optional()
      .or(z.literal("")),
    disclaimer_acknowledged: z.literal(true, {
      errorMap: () => ({
        message:
          "You must acknowledge the service disclaimer before submitting a request.",
      }),
    }),
  })
  .superRefine((data, ctx) => {
    // ── Must be scheduled at least 12 hours in advance ────────
    const [year, month, day] = data.scheduled_date.split("-").map(Number);
    const [hours, minutes] = data.scheduled_start_time.split(":").map(Number);
    const bookingDate = new Date(year, month - 1, day, hours, minutes, 0);
    const minAllowed = new Date(
      Date.now() + BOOKING_ADVANCE_HOURS * 60 * 60 * 1000
    );
    if (bookingDate < minAllowed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Bookings must be scheduled at least ${BOOKING_ADVANCE_HOURS} hours in advance.`,
        path: ["scheduled_date"],
      });
    }

    // ── No overnight bookings ─────────────────────────────────
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + data.duration_hours * 60;
    if (endMinutes >= 24 * 60) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "The booking cannot extend past midnight. Please choose an earlier start time or shorter duration.",
        path: ["scheduled_start_time"],
      });
    }
  });

export type BookingFormData = z.infer<typeof BookingSchema>;

// ── Step-level schemas for per-step validation ──────────────

export const BookingStep1Schema = z.object({
  senior_profile_id: z.string().uuid("Please select a senior."),
});

export const BookingStep2Schema = z.object({
  activity_type_id: z.string().uuid("Please select an activity type."),
});

export const BookingStep3Schema = z
  .object({
    scheduled_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Please select a valid date."),
    scheduled_start_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Please select a valid start time."),
    duration_hours: z
      .number()
      .min(BOOKING_MIN_HOURS, `Minimum duration is ${BOOKING_MIN_HOURS} hours.`)
      .max(BOOKING_MAX_HOURS, `Maximum duration is ${BOOKING_MAX_HOURS} hours.`),
  })
  .superRefine((data, ctx) => {
    const [year, month, day] = data.scheduled_date.split("-").map(Number);
    const [hours, minutes] = data.scheduled_start_time.split(":").map(Number);
    const bookingDate = new Date(year, month - 1, day, hours, minutes, 0);
    const minAllowed = new Date(
      Date.now() + BOOKING_ADVANCE_HOURS * 60 * 60 * 1000
    );
    if (bookingDate < minAllowed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Bookings must be scheduled at least ${BOOKING_ADVANCE_HOURS} hours in advance.`,
        path: ["scheduled_date"],
      });
    }
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + data.duration_hours * 60;
    if (endMinutes >= 24 * 60) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "The booking cannot extend past midnight. Please choose an earlier start time or shorter duration.",
        path: ["scheduled_start_time"],
      });
    }
  });

export const BookingStep4Schema = z.object({
  location_description: z
    .string()
    .min(5, "Please enter a meeting address.")
    .max(500),
  destination_address: z.string().max(500).optional().or(z.literal("")),
});

export const BookingStep5Schema = z.object({
  special_notes: z
    .string()
    .max(1000, "Notes must be 1,000 characters or fewer.")
    .optional()
    .or(z.literal("")),
});

export const BookingStep6Schema = z.object({
  disclaimer_acknowledged: z.literal(true, {
    errorMap: () => ({
      message: "You must acknowledge the service disclaimer to proceed.",
    }),
  }),
});
