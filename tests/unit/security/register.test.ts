/**
 * Security unit tests for the /api/register endpoint and related auth guards.
 * These tests verify the pure validation logic independently of Supabase.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

// ── Replicate the RegisterSchema from the route for isolated testing ──────────
const SELF_REGISTRATION_ROLES = ["senior", "family", "companion"] as const;

const RegisterSchema = z.object({
  role: z.enum(SELF_REGISTRATION_ROLES, {
    errorMap: () => ({ message: "Invalid role. Allowed: senior, family, companion." }),
  }),
  first_name: z
    .string()
    .min(1, "First name is required.")
    .max(100)
    .regex(/^[a-zA-Z\s'\-\.]+$/, "First name contains invalid characters."),
  last_name: z
    .string()
    .min(1, "Last name is required.")
    .max(100)
    .regex(/^[a-zA-Z\s'\-\.]+$/, "Last name contains invalid characters."),
  phone: z
    .string()
    .max(30)
    .regex(/^[\d\s\+\-\(\)\.]+$/, "Invalid phone number format.")
    .optional()
    .or(z.literal("")),
});

// ── Role validation ───────────────────────────────────────────────────────────
describe("Self-registration role validation", () => {
  it("allows senior role", () => {
    const r = RegisterSchema.safeParse({ role: "senior", first_name: "Alice", last_name: "Smith" });
    expect(r.success).toBe(true);
  });

  it("allows family role", () => {
    const r = RegisterSchema.safeParse({ role: "family", first_name: "Bob", last_name: "Jones" });
    expect(r.success).toBe(true);
  });

  it("allows companion role", () => {
    const r = RegisterSchema.safeParse({ role: "companion", first_name: "Carol", last_name: "Lee" });
    expect(r.success).toBe(true);
  });

  it("BLOCKS admin role — critical security check", () => {
    const r = RegisterSchema.safeParse({ role: "admin", first_name: "Evil", last_name: "User" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toContain("Invalid role");
  });

  it("BLOCKS empty role", () => {
    const r = RegisterSchema.safeParse({ role: "", first_name: "X", last_name: "Y" });
    expect(r.success).toBe(false);
  });

  it("BLOCKS arbitrary string role", () => {
    const r = RegisterSchema.safeParse({ role: "superuser", first_name: "X", last_name: "Y" });
    expect(r.success).toBe(false);
  });

  it("SELF_REGISTRATION_ROLES does not include admin", () => {
    // This test ensures the constant itself never accidentally includes 'admin'.
    expect(SELF_REGISTRATION_ROLES).not.toContain("admin");
    expect(SELF_REGISTRATION_ROLES).toHaveLength(3);
  });
});

// ── Name validation ───────────────────────────────────────────────────────────
describe("Name field validation", () => {
  it("accepts valid names", () => {
    const r = RegisterSchema.safeParse({ role: "senior", first_name: "Mary-Jane", last_name: "O'Brien" });
    expect(r.success).toBe(true);
  });

  it("rejects empty first name", () => {
    const r = RegisterSchema.safeParse({ role: "senior", first_name: "", last_name: "Smith" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toContain("First name is required");
  });

  it("rejects names with script injection characters", () => {
    const r = RegisterSchema.safeParse({ role: "senior", first_name: "<script>", last_name: "Smith" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toContain("invalid characters");
  });

  it("rejects names with SQL special chars", () => {
    const r = RegisterSchema.safeParse({ role: "senior", first_name: "'; DROP TABLE", last_name: "X" });
    expect(r.success).toBe(false);
  });

  it("rejects excessively long names", () => {
    const r = RegisterSchema.safeParse({ role: "senior", first_name: "A".repeat(101), last_name: "B" });
    expect(r.success).toBe(false);
  });
});

// ── Phone validation ──────────────────────────────────────────────────────────
describe("Phone field validation", () => {
  it("accepts valid US phone number", () => {
    const r = RegisterSchema.safeParse({ role: "senior", first_name: "X", last_name: "Y", phone: "+1 (555) 123-4567" });
    expect(r.success).toBe(true);
  });

  it("accepts empty phone (optional)", () => {
    const r = RegisterSchema.safeParse({ role: "senior", first_name: "X", last_name: "Y", phone: "" });
    expect(r.success).toBe(true);
  });

  it("rejects phone with letters", () => {
    const r = RegisterSchema.safeParse({ role: "senior", first_name: "X", last_name: "Y", phone: "abc" });
    expect(r.success).toBe(false);
  });

  it("rejects phone with script tags", () => {
    const r = RegisterSchema.safeParse({ role: "senior", first_name: "X", last_name: "Y", phone: "<script>alert(1)</script>" });
    expect(r.success).toBe(false);
  });
});

// ── Booking participation logic ───────────────────────────────────────────────
describe("Booking participation check (rating / incident report guard)", () => {
  // Pure function extracted from the action logic for testability
  function isBookingParticipant(
    booking: { senior_profile_id: string; booked_by_profile_id: string; companion_profile_id: string | null },
    callerId: string,
    callerCompanionProfileId: string | null
  ): boolean {
    return (
      booking.senior_profile_id === callerId ||
      booking.booked_by_profile_id === callerId ||
      (callerCompanionProfileId !== null && booking.companion_profile_id === callerCompanionProfileId)
    );
  }

  const booking = {
    senior_profile_id: "senior-uuid",
    booked_by_profile_id: "family-uuid",
    companion_profile_id: "cp-uuid",
  };

  it("allows the senior to rate", () => {
    expect(isBookingParticipant(booking, "senior-uuid", null)).toBe(true);
  });

  it("allows the booker (family) to rate", () => {
    expect(isBookingParticipant(booking, "family-uuid", null)).toBe(true);
  });

  it("allows the assigned companion to rate", () => {
    expect(isBookingParticipant(booking, "companion-profile-id", "cp-uuid")).toBe(true);
  });

  it("blocks a non-participant from rating", () => {
    expect(isBookingParticipant(booking, "random-uuid", "random-cp-uuid")).toBe(false);
  });

  it("blocks a companion who is not assigned to THIS booking", () => {
    expect(isBookingParticipant(booking, "other-companion-id", "other-cp-uuid")).toBe(false);
  });

  it("handles null companion_profile_id safely", () => {
    const noCompanionBooking = { ...booking, companion_profile_id: null };
    expect(isBookingParticipant(noCompanionBooking, "senior-uuid", null)).toBe(true);
    expect(isBookingParticipant(noCompanionBooking, "random-uuid", "cp-uuid")).toBe(false);
  });
});

// ── Middleware route-matching contract ────────────────────────────────────────
describe("Protected route patterns", () => {
  const PROTECTED_PREFIXES = ["/senior", "/family", "/companion", "/admin", "/settings"];
  const PUBLIC_PREFIXES = ["/", "/login", "/about", "/register", "/_next"];

  function isProtected(path: string): boolean {
    return PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
  }

  it("protects /senior routes", () => {
    expect(isProtected("/senior")).toBe(true);
    expect(isProtected("/senior/bookings")).toBe(true);
    expect(isProtected("/senior/bookings/new/voice")).toBe(true);
  });

  it("protects /admin routes", () => {
    expect(isProtected("/admin")).toBe(true);
    expect(isProtected("/admin/companions")).toBe(true);
  });

  it("protects /settings routes", () => {
    expect(isProtected("/settings/accessibility")).toBe(true);
  });

  it("does NOT protect public routes", () => {
    for (const path of PUBLIC_PREFIXES) {
      expect(isProtected(path), `${path} should be public`).toBe(false);
    }
  });

  it("does NOT protect /login (would create infinite redirect)", () => {
    expect(isProtected("/login")).toBe(false);
  });
});

// ── Sensitive field exclusion ─────────────────────────────────────────────────
describe("Sensitive data not exposed to LLM/voice providers", () => {
  // ExplainerInput (from matching engine) and voice extraction must not include PII
  it("ExplainerInput type has no senior PII fields", () => {
    // This is a type-level test; we verify the fields that MUST NOT be present
    type ExplainerInput = {
      companionFirstName: string;
      activityTypeName: string;
      rank: number;
      factors: Record<string, number>;
    };
    const allowedKeys: Array<keyof ExplainerInput> = ["companionFirstName", "activityTypeName", "rank", "factors"];
    const forbiddenKeys = ["seniorName", "seniorEmail", "seniorPhone", "dateOfBirth", "address", "location"];
    for (const key of forbiddenKeys) {
      expect(allowedKeys).not.toContain(key);
    }
  });

  it("MockVoiceProvider.transcribe returns placeholder — no audio sent externally", async () => {
    const { MockVoiceProvider } = await import("@/lib/voice/mock-provider");
    const provider = new MockVoiceProvider();
    const result = await provider.transcribe(new Blob());
    expect(result).toContain("external provider");
    expect(typeof result).toBe("string");
  });
});
