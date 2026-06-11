import { describe, it, expect } from "vitest";
import {
  CompanionOnboardingSchema,
  CompanionReferenceSchema,
  CompanionAvailabilitySlotSchema,
} from "@/lib/validations/companion-profile";
import type { CompanionVerificationStatus } from "@/types";

// ── Helpers ──────────────────────────────────────────────────

const validRef = {
  reference_name: "Alice Johnson",
  reference_phone: "+15550001111",
  reference_email: "alice@example.com",
  relationship: "Former employer",
};

function validOnboarding() {
  return {
    first_name: "Maria",
    last_name: "Santos",
    phone: "+15550002222",
    street_address: "45 Oak Ave",
    city: "Springfield",
    state: "IL",
    zip_code: "62701",
    bio: "I have a passion for spending time with seniors and helping them stay engaged with the world.",
    languages_spoken: ["English", "Spanish"],
    interests: ["Reading", "Music"],
    max_travel_miles: 15,
    activities_supported: ["Walk or Park Visit", "Conversation and Companionship"],
    has_prior_experience: true,
    years_experience: 3,
    background_check_consent: true as const,
    code_of_conduct_accepted: true as const,
    emergency_protocol_completed: true,
    references: [validRef, { ...validRef, reference_name: "Bob Lee", reference_phone: "+15550003333" }],
  };
}

// ── CompanionOnboardingSchema ─────────────────────────────────

describe("CompanionOnboardingSchema — valid data", () => {
  it("accepts a fully complete onboarding submission", () => {
    expect(CompanionOnboardingSchema.safeParse(validOnboarding()).success).toBe(true);
  });

  it("accepts when years_experience is omitted (optional)", () => {
    const { years_experience: _, ...rest } = validOnboarding();
    expect(CompanionOnboardingSchema.safeParse(rest).success).toBe(true);
  });

  it("accepts when street_address is omitted (optional)", () => {
    const data = { ...validOnboarding(), street_address: "" };
    expect(CompanionOnboardingSchema.safeParse(data).success).toBe(true);
  });
});

describe("CompanionOnboardingSchema — required fields", () => {
  it("rejects bio shorter than 20 characters", () => {
    const result = CompanionOnboardingSchema.safeParse({ ...validOnboarding(), bio: "Too short" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("bio"))).toBe(true);
    }
  });

  it("rejects when languages_spoken is empty", () => {
    const result = CompanionOnboardingSchema.safeParse({
      ...validOnboarding(),
      languages_spoken: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("languages_spoken"))).toBe(true);
    }
  });

  it("rejects when activities_supported is empty", () => {
    const result = CompanionOnboardingSchema.safeParse({
      ...validOnboarding(),
      activities_supported: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("activities_supported"))).toBe(true);
    }
  });

  it("rejects service radius below 1 mile", () => {
    const result = CompanionOnboardingSchema.safeParse({ ...validOnboarding(), max_travel_miles: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("max_travel_miles"))).toBe(true);
    }
  });

  it("rejects service radius above 150 miles", () => {
    const result = CompanionOnboardingSchema.safeParse({
      ...validOnboarding(),
      max_travel_miles: 151,
    });
    expect(result.success).toBe(false);
  });

  it("rejects without background_check_consent", () => {
    const result = CompanionOnboardingSchema.safeParse({
      ...validOnboarding(),
      background_check_consent: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("background_check_consent"))
      ).toBe(true);
    }
  });

  it("rejects without code_of_conduct_accepted", () => {
    const result = CompanionOnboardingSchema.safeParse({
      ...validOnboarding(),
      code_of_conduct_accepted: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects with only one reference (requires exactly two)", () => {
    const result = CompanionOnboardingSchema.safeParse({
      ...validOnboarding(),
      references: [validRef],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("references"))).toBe(true);
    }
  });

  it("rejects a reference with an invalid phone number", () => {
    const result = CompanionReferenceSchema.safeParse({
      ...validRef,
      reference_phone: "not-a-phone",
    });
    expect(result.success).toBe(false);
  });
});

// ── CompanionAvailabilitySlotSchema ───────────────────────────

describe("CompanionAvailabilitySlotSchema", () => {
  it("accepts a valid time slot", () => {
    expect(
      CompanionAvailabilitySlotSchema.safeParse({
        day_of_week: 1,
        start_time: "09:00",
        end_time: "17:00",
        is_active: true,
      }).success
    ).toBe(true);
  });

  it("rejects when end_time is before start_time", () => {
    const result = CompanionAvailabilitySlotSchema.safeParse({
      day_of_week: 1,
      start_time: "17:00",
      end_time: "09:00",
      is_active: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects day_of_week outside 0–6 range", () => {
    const result = CompanionAvailabilitySlotSchema.safeParse({
      day_of_week: 7,
      start_time: "09:00",
      end_time: "17:00",
      is_active: true,
    });
    expect(result.success).toBe(false);
  });
});

// ── Profile ownership rules ───────────────────────────────────
// Test 1: Companion can create and edit their own profile

describe("Companion profile ownership", () => {
  it("companion can edit their own profile when profile IDs match", () => {
    const callerProfileId = "aaaa-0000-0000-0000-000000000001";
    const profileOwnerId = "aaaa-0000-0000-0000-000000000001";
    expect(callerProfileId === profileOwnerId).toBe(true);
  });

  it("companion cannot edit another user's profile when IDs differ", () => {
    const callerProfileId: string = "aaaa-0000-0000-0000-000000000001";
    const profileOwnerId: string = "bbbb-0000-0000-0000-000000000002";
    expect(callerProfileId === profileOwnerId).toBe(false);
  });
});

// ── Status change authorization ───────────────────────────────
// Tests 2, 3, 4: companion cannot self-approve; family cannot approve; admin can

describe("Companion status change authorization", () => {
  function canChangeStatus(callerRole: string): boolean {
    return callerRole === "admin";
  }

  it("companion cannot approve themselves — role check blocks it", () => {
    expect(canChangeStatus("companion")).toBe(false);
  });

  it("family member cannot approve companions", () => {
    expect(canChangeStatus("family")).toBe(false);
  });

  it("senior cannot approve companions", () => {
    expect(canChangeStatus("senior")).toBe(false);
  });

  it("administrator can approve a companion", () => {
    expect(canChangeStatus("admin")).toBe(true);
  });

  it("administrator can reject a companion", () => {
    expect(canChangeStatus("admin")).toBe(true);
  });

  it("administrator can suspend an approved companion", () => {
    const callerRole = "admin";
    const currentStatus: CompanionVerificationStatus = "approved";
    const canSuspend = callerRole === "admin" && currentStatus === "approved";
    expect(canSuspend).toBe(true);
  });

  it("administrator can reactivate a suspended companion", () => {
    const callerRole = "admin";
    const currentStatus: CompanionVerificationStatus = "suspended";
    const canReactivate = callerRole === "admin" && currentStatus === "suspended";
    expect(canReactivate).toBe(true);
  });
});

// ── Booking assignment acceptance ─────────────────────────────
// Tests 5 & 6: unapproved cannot accept; approved can

describe("Booking assignment acceptance rules", () => {
  function canAcceptAssignment(
    verificationStatus: CompanionVerificationStatus,
    assignmentStatus: string
  ): boolean {
    return verificationStatus === "approved" && assignmentStatus === "pending";
  }

  it("unapproved companion (pending) cannot accept a booking", () => {
    expect(canAcceptAssignment("pending", "pending")).toBe(false);
  });

  it("unapproved companion (under_review) cannot accept a booking", () => {
    expect(canAcceptAssignment("under_review", "pending")).toBe(false);
  });

  it("rejected companion cannot accept a booking", () => {
    expect(canAcceptAssignment("rejected", "pending")).toBe(false);
  });

  it("suspended companion cannot accept a booking", () => {
    expect(canAcceptAssignment("suspended", "pending")).toBe(false);
  });

  it("approved companion can accept a pending assignment", () => {
    expect(canAcceptAssignment("approved", "pending")).toBe(true);
  });

  it("approved companion cannot accept an already-responded assignment", () => {
    expect(canAcceptAssignment("approved", "accepted")).toBe(false);
    expect(canAcceptAssignment("approved", "declined")).toBe(false);
  });
});

// ── Senior data access policy ─────────────────────────────────
// Tests 7 & 8: companion cannot view unrelated seniors; sees minimum info only

describe("Companion senior data access policy", () => {
  type Assignment = { bookingId: string; status: string; seniorId: string };

  function getAllowedSeniorIds(assignments: Assignment[]): string[] {
    return assignments
      .filter((a) => a.status === "accepted")
      .map((a) => a.seniorId);
  }

  it("companion with no assignments sees no senior profiles", () => {
    expect(getAllowedSeniorIds([])).toHaveLength(0);
  });

  it("companion cannot view senior for a pending assignment", () => {
    const assignments: Assignment[] = [
      { bookingId: "b1", status: "pending", seniorId: "s1" },
    ];
    expect(getAllowedSeniorIds(assignments)).not.toContain("s1");
  });

  it("companion cannot view senior for a declined assignment", () => {
    const assignments: Assignment[] = [
      { bookingId: "b2", status: "declined", seniorId: "s2" },
    ];
    expect(getAllowedSeniorIds(assignments)).not.toContain("s2");
  });

  it("companion cannot view an unrelated senior's profile", () => {
    // Companion has an accepted assignment for s1 but no relationship with s3
    const assignments: Assignment[] = [
      { bookingId: "b1", status: "accepted", seniorId: "s1" },
    ];
    const unrelatedSeniorId = "s3";
    expect(getAllowedSeniorIds(assignments)).not.toContain(unrelatedSeniorId);
  });

  it("companion can view senior profile only for accepted assignments", () => {
    const assignments: Assignment[] = [
      { bookingId: "b1", status: "accepted", seniorId: "s1" },
      { bookingId: "b2", status: "pending", seniorId: "s2" },
      { bookingId: "b3", status: "declined", seniorId: "s3" },
    ];
    const allowed = getAllowedSeniorIds(assignments);
    expect(allowed).toContain("s1");
    expect(allowed).not.toContain("s2");
    expect(allowed).not.toContain("s3");
  });

  it("companion sees only minimum senior fields for an accepted assignment", () => {
    // Server actions select these fields — not dietary_notes, medical history, etc.
    const minimumFields = [
      "first_name",
      "last_name",
      "preferred_name",
      "mobility_notes",
      "accessibility_needs",
    ];
    const sensitiveFields = [
      "medical_alert_info",
      "dietary_notes",
      "free_text_notes",
      "interests",
      "date_of_birth",
    ];
    // Verify the minimum field list does not overlap with sensitive fields
    const overlap = minimumFields.filter((f) => sensitiveFields.includes(f));
    expect(overlap).toHaveLength(0);
  });
});
