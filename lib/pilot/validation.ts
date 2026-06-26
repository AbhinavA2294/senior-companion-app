import type { PilotSettings } from "./config";

/**
 * Validate booking scheduling against pilot service hours and duration limits.
 * Pure function — no async I/O, importable from client or server code.
 * Returns an error string, or null if valid.
 */
export function validateBookingAgainstPilotSettings(
  scheduledDate: string,
  startTime: string,
  durationHours: number,
  settings: PilotSettings
): string | null {
  const [sh, sm] = settings.serviceHoursStart.split(":").map(Number);
  const [eh, em] = settings.serviceHoursEnd.split(":").map(Number);
  const [bh, bm] = startTime.split(":").map(Number);

  const serviceStartMin = sh * 60 + sm;
  const serviceEndMin   = eh * 60 + em;
  const bookingStartMin = bh * 60 + bm;
  const bookingEndMin   = bookingStartMin + durationHours * 60;

  if (bookingStartMin < serviceStartMin) {
    return `Bookings cannot start before ${settings.serviceHoursStart}. Our service hours are ${settings.serviceHoursStart}–${settings.serviceHoursEnd}.`;
  }
  if (bookingEndMin > serviceEndMin) {
    return `This booking would end after ${settings.serviceHoursEnd}. Please choose an earlier start time or shorter duration. Service closes at ${settings.serviceHoursEnd}.`;
  }

  if (durationHours < settings.minBookingHours) {
    return `Minimum booking duration is ${settings.minBookingHours} hours.`;
  }
  if (durationHours > settings.maxBookingHours) {
    return `Maximum booking duration is ${settings.maxBookingHours} hours.`;
  }

  // Max advance days check
  const [year, month, day] = scheduledDate.split("-").map(Number);
  const bookingDate = new Date(year, month - 1, day);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + settings.maxAdvanceDays);
  if (bookingDate > maxDate) {
    return `Bookings cannot be scheduled more than ${settings.maxAdvanceDays} days in advance.`;
  }

  return null;
}
