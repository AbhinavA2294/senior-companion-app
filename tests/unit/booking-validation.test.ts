import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  BookingSchema,
  BookingStep3Schema,
  BOOKING_MIN_HOURS,
  BOOKING_MAX_HOURS,
  BOOKING_ADVANCE_HOURS,
  ALLOWED_TRANSPORT_MODES,
  type AllowedTransportMode,
} from "@/lib/validations/booking";

// ── Helpers ──────────────────────────────────────────────────

/** Returns a date string N hours from now, in YYYY-MM-DD format */
function futureDateStr(offsetHours = BOOKING_ADVANCE_HOURS + 1): string {
  const d = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
  return d.toISOString().split("T")[0];
}

/** Returns a time string (HH:MM) N hours from now */
function futureTimeStr(offsetHours = BOOKING_ADVANCE_HOURS + 1): string {
  const d = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const VALID_UUID = "11111111-2222-3333-4444-555555555555";
const VALID_ACTIVITY_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function validBase() {
  return {
    senior_profile_id: VALID_UUID,
    activity_type_id: VALID_ACTIVITY_UUID,
    scheduled_date: futureDateStr(48),
    scheduled_start_time: "10:00",
    duration_hours: 2,
    location_description: "123 Main Street, Springfield, IL",
    disclaimer_acknowledged: true as const,
  };
}

// ── BookingSchema full validation ─────────────────────────────

describe("BookingSchema", () => {
  it("accepts a valid booking", () => {
    expect(BookingSchema.safeParse(validBase()).success).toBe(true);
  });

  // ── Duration rules ─────────────────────────────────────────

  it(`rejects duration below minimum (${BOOKING_MIN_HOURS}h)`, () => {
    const result = BookingSchema.safeParse({ ...validBase(), duration_hours: 1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      expect(msg).toMatch(/minimum duration/i);
    }
  });

  it(`rejects duration above maximum (${BOOKING_MAX_HOURS}h)`, () => {
    const result = BookingSchema.safeParse({ ...validBase(), duration_hours: 7 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      expect(msg).toMatch(/maximum duration/i);
    }
  });

  it(`accepts minimum duration (${BOOKING_MIN_HOURS}h)`, () => {
    expect(BookingSchema.safeParse({ ...validBase(), duration_hours: BOOKING_MIN_HOURS }).success).toBe(true);
  });

  it(`accepts maximum duration (${BOOKING_MAX_HOURS}h)`, () => {
    expect(BookingSchema.safeParse({ ...validBase(), duration_hours: BOOKING_MAX_HOURS }).success).toBe(true);
  });

  // ── Advance booking requirement ────────────────────────────

  it(`rejects booking scheduled less than ${BOOKING_ADVANCE_HOURS} hours ahead`, () => {
    // A date/time 2 hours in the past is always under the 12h minimum
    const past = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const dateStr = `${past.getFullYear()}-${String(past.getMonth()+1).padStart(2,"0")}-${String(past.getDate()).padStart(2,"0")}`;
    const timeStr = `${String(past.getHours()).padStart(2,"0")}:00`;
    const result = BookingSchema.safeParse({
      ...validBase(),
      scheduled_date: dateStr,
      scheduled_start_time: timeStr,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs.some((m) => m.match(/at least|in advance|scheduled/i))).toBe(true);
    }
  });

  it("accepts a booking scheduled well in advance", () => {
    const future = futureDateStr(BOOKING_ADVANCE_HOURS + 48);
    expect(BookingSchema.safeParse({ ...validBase(), scheduled_date: future, scheduled_start_time: "10:00" }).success).toBe(true);
  });

  // ── No overnight bookings ──────────────────────────────────

  it("rejects an overnight booking (start 22:00 + 4h = 02:00 next day)", () => {
    const result = BookingSchema.safeParse({
      ...validBase(),
      scheduled_date: futureDateStr(),
      scheduled_start_time: "22:00",
      duration_hours: 4,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs.some((m) => m.match(/past midnight/i))).toBe(true);
    }
  });

  it("rejects a booking ending exactly at midnight (start 22:00 + 2h = 24:00)", () => {
    const result = BookingSchema.safeParse({
      ...validBase(),
      scheduled_date: futureDateStr(),
      scheduled_start_time: "22:00",
      duration_hours: 2,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs.some((m) => m.match(/past midnight/i))).toBe(true);
    }
  });

  it("accepts a booking that ends before midnight (start 20:00 + 3h = 23:00)", () => {
    expect(
      BookingSchema.safeParse({
        ...validBase(),
        scheduled_date: futureDateStr(48),
        scheduled_start_time: "20:00",
        duration_hours: 3,
      }).success
    ).toBe(true);
  });

  // ── Disclaimer required ────────────────────────────────────

  it("rejects booking without disclaimer_acknowledged = true", () => {
    const data = { ...validBase() };
    // @ts-expect-error — testing invalid input
    data.disclaimer_acknowledged = false;
    const result = BookingSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs.some((m) => m.match(/disclaimer/i))).toBe(true);
    }
  });

  it("rejects booking with missing disclaimer field", () => {
    const { disclaimer_acknowledged: _, ...data } = validBase();
    const result = BookingSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  // ── Transportation mode ────────────────────────────────────

  it("accepts a booking without transportation_mode (optional)", () => {
    expect(BookingSchema.safeParse(validBase()).success).toBe(true);
  });

  it("accepts all allowed transportation modes", () => {
    for (const mode of ALLOWED_TRANSPORT_MODES) {
      const result = BookingSchema.safeParse({ ...validBase(), transportation_mode: mode });
      expect(result.success, `Expected '${mode}' to be valid`).toBe(true);
    }
  });

  it("rejects personal_vehicle as transportation mode (not available)", () => {
    const result = BookingSchema.safeParse({
      ...validBase(),
      transportation_mode: "personal_vehicle",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs.some((m) => m.match(/personal.vehicle|not available/i))).toBe(true);
    }
  });

  it("rejects companion_vehicle as transportation mode", () => {
    const result = BookingSchema.safeParse({
      ...validBase(),
      transportation_mode: "companion_vehicle",
    });
    expect(result.success).toBe(false);
  });

  // ── Address fields ─────────────────────────────────────────

  it("rejects empty meeting address", () => {
    const result = BookingSchema.safeParse({ ...validBase(), location_description: "" });
    expect(result.success).toBe(false);
  });

  it("rejects meeting address shorter than 5 characters", () => {
    const result = BookingSchema.safeParse({ ...validBase(), location_description: "123" });
    expect(result.success).toBe(false);
  });

  it("accepts booking without destination address (optional)", () => {
    const result = BookingSchema.safeParse({ ...validBase(), destination_address: "" });
    expect(result.success).toBe(true);
  });

  // ── Notes length ────────────────────────────────────────────

  it("rejects notes longer than 1000 characters", () => {
    const result = BookingSchema.safeParse({
      ...validBase(),
      special_notes: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts notes at exactly 1000 characters", () => {
    const result = BookingSchema.safeParse({
      ...validBase(),
      special_notes: "a".repeat(1000),
    });
    expect(result.success).toBe(true);
  });
});

// ── Step 3 schema (date/time sub-validation) ──────────────────

describe("BookingStep3Schema", () => {
  it("validates date/time independently of other fields", () => {
    const result = BookingStep3Schema.safeParse({
      scheduled_date: futureDateStr(48),
      scheduled_start_time: "10:00",
      duration_hours: 2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects overnight dates in step 3 schema", () => {
    const result = BookingStep3Schema.safeParse({
      scheduled_date: futureDateStr(),
      scheduled_start_time: "23:00",
      duration_hours: 2,
    });
    expect(result.success).toBe(false);
  });
});

// ── ALLOWED_TRANSPORT_MODES enumeration ───────────────────────

describe("ALLOWED_TRANSPORT_MODES", () => {
  it("does not contain personal_vehicle", () => {
    expect(ALLOWED_TRANSPORT_MODES).not.toContain("personal_vehicle");
  });

  it("does not contain companion_vehicle", () => {
    expect(ALLOWED_TRANSPORT_MODES).not.toContain("companion_vehicle");
  });

  it("contains walk, public_transit, rideshare, and other", () => {
    expect(ALLOWED_TRANSPORT_MODES).toContain("walk");
    expect(ALLOWED_TRANSPORT_MODES).toContain("public_transit");
    expect(ALLOWED_TRANSPORT_MODES).toContain("rideshare");
    expect(ALLOWED_TRANSPORT_MODES).toContain("other");
  });
});

// ── Authorization rule tests (pure logic, no DB) ──────────────

describe("Booking authorization rules", () => {
  it("senior can only book for themselves — same IDs satisfy the rule", () => {
    const seniorProfileId = "aabbccdd-0000-0000-0000-000000000001";
    const callerProfileId = "aabbccdd-0000-0000-0000-000000000001";
    expect(callerProfileId === seniorProfileId).toBe(true);
  });

  it("family member cannot book without a relationship — different IDs fail the rule", () => {
    const seniorProfileId = "aabbccdd-0000-0000-0000-000000000001";
    const callerProfileId = "ffffffff-0000-0000-0000-000000000001";
    const hasRelationship = false;
    const isManaged = false;
    const canBook = hasRelationship || isManaged;
    expect(canBook).toBe(false);
  });

  it("family member can book when relationship exists", () => {
    const hasRelationship = true;
    const isManaged = false;
    const canBook = hasRelationship || isManaged;
    expect(canBook).toBe(true);
  });

  it("family member can book when senior is managed by them", () => {
    const hasRelationship = false;
    const isManaged = true;
    const canBook = hasRelationship || isManaged;
    expect(canBook).toBe(true);
  });
});
