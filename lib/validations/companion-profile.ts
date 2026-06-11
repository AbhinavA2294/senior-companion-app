import { z } from "zod";

const phoneRegex = /^\+?[1-9]\d{9,14}$/;
const zipRegex = /^\d{5}(-\d{4})?$/;

// ── Single reference ─────────────────────────────────────────

export const CompanionReferenceSchema = z.object({
  reference_name: z.string().min(1, "Reference name is required.").max(100),
  reference_phone: z
    .string()
    .regex(phoneRegex, "Please enter a valid phone number (e.g. +15550001234)."),
  reference_email: z
    .string()
    .email("Please enter a valid email address.")
    .optional()
    .or(z.literal("")),
  relationship: z.string().min(1, "Relationship to reference is required.").max(100),
});

export type CompanionReferenceFormData = z.infer<typeof CompanionReferenceSchema>;

// ── Full onboarding form ──────────────────────────────────────

export const CompanionOnboardingSchema = z.object({
  // ── profiles table ───────────────────────────────────────
  first_name: z.string().min(1, "First name is required.").max(50),
  last_name: z.string().min(1, "Last name is required.").max(50),
  phone: z
    .string()
    .regex(phoneRegex, "Please enter a valid phone number.")
    .or(z.literal("")),
  street_address: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(1, "City is required.").max(100),
  state: z.string().min(2, "State is required.").max(50),
  zip_code: z
    .string()
    .regex(zipRegex, "Please enter a valid ZIP code.")
    .or(z.literal("")),
  bio: z
    .string()
    .min(20, "Please write at least 20 characters about yourself.")
    .max(1000),

  // ── companion_profiles table ─────────────────────────────
  languages_spoken: z
    .array(z.string())
    .min(1, "Please select at least one language."),
  interests: z.array(z.string()).default([]),
  max_travel_miles: z
    .number({
      required_error: "Service radius is required.",
      invalid_type_error: "Service radius must be a number.",
    })
    .int()
    .min(1, "Minimum service radius is 1 mile.")
    .max(150, "Maximum service radius is 150 miles."),
  activities_supported: z
    .array(z.string())
    .min(1, "Please select at least one activity."),
  has_prior_experience: z.boolean(),
  years_experience: z.number().int().min(0).max(50).nullable().optional(),

  // ── Compliance checkboxes ────────────────────────────────
  background_check_consent: z.literal(true, {
    errorMap: () => ({
      message: "Background check consent is required to proceed.",
    }),
  }),
  code_of_conduct_accepted: z.literal(true, {
    errorMap: () => ({
      message: "You must accept the code of conduct to proceed.",
    }),
  }),
  emergency_protocol_completed: z.boolean().default(false),

  // ── Two references (required) ─────────────────────────────
  references: z
    .array(CompanionReferenceSchema)
    .length(2, "Exactly two references are required."),
});

export type CompanionOnboardingFormData = z.infer<typeof CompanionOnboardingSchema>;

// ── Availability slot ─────────────────────────────────────────

export const CompanionAvailabilitySlotSchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Please enter a valid time (HH:MM)."),
    end_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Please enter a valid time (HH:MM)."),
    is_active: z.boolean().default(true),
  })
  .refine((d) => d.end_time > d.start_time, {
    message: "End time must be after start time.",
    path: ["end_time"],
  });

export const CompanionAvailabilitySchema = z.object({
  slots: z.array(CompanionAvailabilitySlotSchema),
});

export type CompanionAvailabilityFormData = z.infer<
  typeof CompanionAvailabilitySchema
>;
