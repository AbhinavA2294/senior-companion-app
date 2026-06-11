import { z } from "zod";

const phoneRegex = /^\+?[1-9]\d{9,14}$/;
const zipRegex = /^\d{5}(-\d{4})?$/;

export const SeniorProfileSchema = z.object({
  // ── Basic identity (profiles table) ─────────────────────────
  first_name: z.string().min(1, "First name is required.").max(50),
  last_name: z.string().min(1, "Last name is required.").max(50),
  phone: z
    .string()
    .regex(phoneRegex, "Please enter a valid phone number.")
    .or(z.literal("")),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date (YYYY-MM-DD).")
    .optional()
    .or(z.literal("")),
  street_address: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(1, "City is required.").max(100),
  state: z.string().min(2, "State is required.").max(50),
  zip_code: z
    .string()
    .regex(zipRegex, "Please enter a valid ZIP code.")
    .or(z.literal("")),

  // ── Senior-specific fields (senior_profiles table) ───────────
  preferred_name: z.string().max(50).optional().or(z.literal("")),
  contact_email: z
    .string()
    .email("Please enter a valid email address.")
    .optional()
    .or(z.literal("")),
  preferred_language: z.string().min(1, "Preferred language is required.").max(50),
  additional_languages: z.array(z.string().max(50)).default([]),
  preferred_companion_gender: z
    .enum(["male", "female", "no_preference"])
    .optional()
    .or(z.literal("" as never)),
  interests: z.array(z.string().max(100)).default([]),
  accessibility_needs: z.string().max(500).optional().or(z.literal("")),
  mobility_notes: z.string().max(500).optional().or(z.literal("")),
  dietary_notes: z.string().max(500).optional().or(z.literal("")),
  free_text_notes: z.string().max(1000).optional().or(z.literal("")),

  // ── Relationship label (for family-member context) ───────────
  relationship_label: z.string().min(1, "Please describe your relationship.").max(50).optional(),
});

export type SeniorProfileFormData = z.infer<typeof SeniorProfileSchema>;

// ── Emergency contact schema ─────────────────────────────────

export const EmergencyContactSchema = z.object({
  name: z.string().min(1, "Contact name is required.").max(100),
  relationship: z.string().min(1, "Relationship is required.").max(50),
  phone: z
    .string()
    .regex(phoneRegex, "Please enter a valid phone number.")
    .min(1, "Phone number is required."),
  email: z
    .string()
    .email("Please enter a valid email address.")
    .optional()
    .or(z.literal("")),
  is_primary: z.boolean().default(true),
});

export type EmergencyContactFormData = z.infer<typeof EmergencyContactSchema>;
