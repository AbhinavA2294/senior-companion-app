/**
 * Static pilot constraints — these never change via the admin UI.
 * They represent hard service boundaries for the pilot phase.
 */
export const PILOT_CONSTRAINTS = {
  allowOvernightBookings: false,
  allowEmergencyRequests: false,
  allowMedicalCare: false,
  allowPersonalCare: false,
  allowCompanionDriving: false,
  allowCashPayments: false,
  requireCompanionAdminApproval: true,
  requireHumanAIReview: true,
} as const;

/**
 * Feature flags driven by environment variables.
 * These can be toggled for a deployment without a code change.
 * Default to the safe/enabled state when the variable is absent.
 */
export const PILOT_FLAGS = {
  feedbackEnabled: process.env.PILOT_FEEDBACK_ENABLED !== "false",
  voiceBookingEnabled: process.env.PILOT_VOICE_BOOKING !== "false",
  matchingEnabled: process.env.MATCHING_ENABLED !== "false",
  requireFirstBookingReview: process.env.PILOT_REQUIRE_FIRST_BOOKING_REVIEW !== "false",
} as const;

/** Safe defaults used when pilot_settings rows cannot be read from the DB. */
export const PILOT_DEFAULTS = {
  serviceHoursStart: "08:00",
  serviceHoursEnd: "20:00",
  minBookingHours: 2,
  maxBookingHours: 6,
  minAdvanceHours: 12,
  maxAdvanceDays: 30,
  supportPhone: "1-800-555-CARE",
  supportEmail: "support@seniorcompanion.example.com",
  serviceAreaDescription: "Greater Metro Area (Pilot)",
  pilotMaxSeniors: 25,
  pilotMaxCompanions: 20,
} as const;

export type PilotSettings = {
  serviceHoursStart: string;
  serviceHoursEnd: string;
  minBookingHours: number;
  maxBookingHours: number;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  supportPhone: string;
  supportEmail: string;
  serviceAreaDescription: string;
  serviceZipCodes: string;
  pilotMaxSeniors: number;
  pilotMaxCompanions: number;
  requireFirstBookingReview: boolean;
  requireHumanAIReview: boolean;
  feedbackEnabled: boolean;
};
