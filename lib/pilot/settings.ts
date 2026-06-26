"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { PILOT_DEFAULTS, type PilotSettings } from "./config";

function parseNumber(value: string, fallback: number): number {
  const n = parseFloat(value);
  return isNaN(n) ? fallback : n;
}

function parseBool(value: string, fallback: boolean): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

/**
 * Read all pilot_settings rows and return a typed PilotSettings object.
 * Falls back to PILOT_DEFAULTS for any missing keys.
 * Uses the service-role client so callers don't need to be admins.
 */
export async function loadPilotSettings(): Promise<PilotSettings> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("pilot_settings").select("key, value");

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.key as string] = row.value as string;
  }

  return {
    serviceHoursStart:         map["service_hours_start"]           ?? PILOT_DEFAULTS.serviceHoursStart,
    serviceHoursEnd:           map["service_hours_end"]             ?? PILOT_DEFAULTS.serviceHoursEnd,
    minBookingHours:           parseNumber(map["min_booking_hours"], PILOT_DEFAULTS.minBookingHours),
    maxBookingHours:           parseNumber(map["max_booking_hours"], PILOT_DEFAULTS.maxBookingHours),
    minAdvanceHours:           parseNumber(map["min_advance_hours"], PILOT_DEFAULTS.minAdvanceHours),
    maxAdvanceDays:            parseNumber(map["max_advance_days"],  PILOT_DEFAULTS.maxAdvanceDays),
    supportPhone:              map["support_phone"]                  ?? PILOT_DEFAULTS.supportPhone,
    supportEmail:              map["support_email"]                  ?? PILOT_DEFAULTS.supportEmail,
    serviceAreaDescription:    map["service_area_description"]       ?? PILOT_DEFAULTS.serviceAreaDescription,
    serviceZipCodes:           map["service_zip_codes"]              ?? "",
    pilotMaxSeniors:           parseNumber(map["pilot_max_seniors"],    PILOT_DEFAULTS.pilotMaxSeniors),
    pilotMaxCompanions:        parseNumber(map["pilot_max_companions"], PILOT_DEFAULTS.pilotMaxCompanions),
    requireFirstBookingReview: parseBool(map["require_first_booking_review"], true),
    requireHumanAIReview:      parseBool(map["require_human_ai_review"], true),
    feedbackEnabled:           parseBool(map["feedback_enabled"], true),
  };
}
