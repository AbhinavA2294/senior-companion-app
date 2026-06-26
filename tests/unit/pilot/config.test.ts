import { describe, it, expect } from "vitest";
import { PILOT_CONSTRAINTS, PILOT_DEFAULTS } from "@/lib/pilot/config";
import { validateBookingAgainstPilotSettings } from "@/lib/pilot/validation";
import type { PilotSettings } from "@/lib/pilot/config";

// Set maxAdvanceDays high so service-hours and duration tests can use a fixed
// far-future date without tripping the advance-days limit.
const defaultSettings: PilotSettings = {
  serviceHoursStart:         PILOT_DEFAULTS.serviceHoursStart,
  serviceHoursEnd:           PILOT_DEFAULTS.serviceHoursEnd,
  minBookingHours:           PILOT_DEFAULTS.minBookingHours,
  maxBookingHours:           PILOT_DEFAULTS.maxBookingHours,
  minAdvanceHours:           PILOT_DEFAULTS.minAdvanceHours,
  maxAdvanceDays:            99999,
  supportPhone:              PILOT_DEFAULTS.supportPhone,
  supportEmail:              PILOT_DEFAULTS.supportEmail,
  serviceAreaDescription:    PILOT_DEFAULTS.serviceAreaDescription,
  serviceZipCodes:           "",
  pilotMaxSeniors:           PILOT_DEFAULTS.pilotMaxSeniors,
  pilotMaxCompanions:        PILOT_DEFAULTS.pilotMaxCompanions,
  requireFirstBookingReview: true,
  requireHumanAIReview:      true,
  feedbackEnabled:           true,
};

// Future date that won't fail advance-days check
const futureDate = "2099-01-15";

describe("PILOT_CONSTRAINTS — hard service boundaries", () => {
  it("overnight bookings are blocked", () => {
    expect(PILOT_CONSTRAINTS.allowOvernightBookings).toBe(false);
  });

  it("emergency requests are blocked", () => {
    expect(PILOT_CONSTRAINTS.allowEmergencyRequests).toBe(false);
  });

  it("medical care is blocked", () => {
    expect(PILOT_CONSTRAINTS.allowMedicalCare).toBe(false);
  });

  it("companion driving is blocked", () => {
    expect(PILOT_CONSTRAINTS.allowCompanionDriving).toBe(false);
  });

  it("cash payments are blocked", () => {
    expect(PILOT_CONSTRAINTS.allowCashPayments).toBe(false);
  });

  it("companion admin approval is required", () => {
    expect(PILOT_CONSTRAINTS.requireCompanionAdminApproval).toBe(true);
  });

  it("human review of AI is required", () => {
    expect(PILOT_CONSTRAINTS.requireHumanAIReview).toBe(true);
  });
});

describe("PILOT_DEFAULTS — sensible fallback values", () => {
  it("default service start is 08:00", () => {
    expect(PILOT_DEFAULTS.serviceHoursStart).toBe("08:00");
  });

  it("default service end is 20:00", () => {
    expect(PILOT_DEFAULTS.serviceHoursEnd).toBe("20:00");
  });

  it("default min booking hours is 2", () => {
    expect(PILOT_DEFAULTS.minBookingHours).toBe(2);
  });

  it("default max booking hours is 6", () => {
    expect(PILOT_DEFAULTS.maxBookingHours).toBe(6);
  });

  it("default advance notice is 12 hours", () => {
    expect(PILOT_DEFAULTS.minAdvanceHours).toBe(12);
  });
});

describe("validateBookingAgainstPilotSettings — service hours", () => {
  it("allows a booking within service hours", () => {
    const err = validateBookingAgainstPilotSettings(futureDate, "10:00", 2, defaultSettings);
    expect(err).toBeNull();
  });

  it("allows a booking starting at exactly service open time", () => {
    const err = validateBookingAgainstPilotSettings(futureDate, "08:00", 2, defaultSettings);
    expect(err).toBeNull();
  });

  it("allows a booking ending at exactly service close time (18:00 + 2h = 20:00)", () => {
    const err = validateBookingAgainstPilotSettings(futureDate, "18:00", 2, defaultSettings);
    expect(err).toBeNull();
  });

  it("blocks a booking starting before service hours", () => {
    const err = validateBookingAgainstPilotSettings(futureDate, "07:00", 2, defaultSettings);
    expect(err).not.toBeNull();
    expect(err).toContain("08:00");
  });

  it("blocks a booking ending after service hours (19:00 + 2h = 21:00 > 20:00)", () => {
    const err = validateBookingAgainstPilotSettings(futureDate, "19:00", 2, defaultSettings);
    expect(err).not.toBeNull();
    expect(err).toContain("20:00");
  });

  it("blocks a booking starting at service close time (20:00 + 2h past close)", () => {
    const err = validateBookingAgainstPilotSettings(futureDate, "20:00", 2, defaultSettings);
    expect(err).not.toBeNull();
  });
});

describe("validateBookingAgainstPilotSettings — duration limits", () => {
  it("allows maximum duration", () => {
    const err = validateBookingAgainstPilotSettings(futureDate, "10:00", 6, defaultSettings);
    expect(err).toBeNull();
  });

  it("blocks duration below minimum", () => {
    const err = validateBookingAgainstPilotSettings(futureDate, "10:00", 1, defaultSettings);
    expect(err).not.toBeNull();
    expect(err).toContain("2");
  });

  it("blocks duration above maximum", () => {
    const err = validateBookingAgainstPilotSettings(futureDate, "10:00", 7, defaultSettings);
    expect(err).not.toBeNull();
    expect(err).toContain("6");
  });
});

describe("validateBookingAgainstPilotSettings — advance days limit", () => {
  it("blocks a booking too far in the future", () => {
    const err = validateBookingAgainstPilotSettings("2099-01-15", "10:00", 2, {
      ...defaultSettings,
      maxAdvanceDays: 30,
    });
    expect(err).not.toBeNull();
    expect(err).toContain("30");
  });

  it("allows a booking within the advance limit", () => {
    const nearDate = new Date();
    nearDate.setDate(nearDate.getDate() + 5);
    const dateStr = nearDate.toISOString().split("T")[0];
    const err = validateBookingAgainstPilotSettings(dateStr, "10:00", 2, defaultSettings);
    expect(err).toBeNull();
  });
});

describe("validateBookingAgainstPilotSettings — custom settings", () => {
  it("respects admin-configured shorter max booking hours", () => {
    const narrowSettings = { ...defaultSettings, maxBookingHours: 4 };
    expect(validateBookingAgainstPilotSettings(futureDate, "10:00", 5, narrowSettings)).not.toBeNull();
    expect(validateBookingAgainstPilotSettings(futureDate, "10:00", 4, narrowSettings)).toBeNull();
  });

  it("respects admin-configured later service start time", () => {
    const lateStartSettings = { ...defaultSettings, serviceHoursStart: "09:00" };
    expect(validateBookingAgainstPilotSettings(futureDate, "08:00", 2, lateStartSettings)).not.toBeNull();
    expect(validateBookingAgainstPilotSettings(futureDate, "09:00", 2, lateStartSettings)).toBeNull();
  });
});
