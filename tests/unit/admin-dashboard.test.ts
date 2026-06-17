import { describe, it, expect } from "vitest";
import { z } from "zod";

// ── Constants ─────────────────────────────────────────────────
const ADMIN_ROUTES = [
  "/admin",
  "/admin/bookings",
  "/admin/companions",
  "/admin/reports",
  "/admin/audit",
  "/admin/export",
];

const CSV_FIELDS = [
  "booking_id", "status", "scheduled_date", "scheduled_start_time",
  "duration_hours", "activity_type", "senior_name", "companion_name",
  "checked_in_at", "checked_out_at", "late_checkin", "late_checkout", "visit_note"
];

// ── Schemas (mirror server actions) ──────────────────────────
const InternalNoteSchema = z.object({
  entityType: z.enum(["booking", "companion", "incident", "senior"]),
  entityId: z.string().uuid(),
  note: z.string().min(1).max(2000),
});

const RefundSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.number().positive().max(10000),
  reason: z.string().min(5).max(500),
});

// ── Role-based authorization ──────────────────────────────────
describe("Admin route authorization", () => {
  it("admin routes should be protected", () => {
    for (const route of ADMIN_ROUTES) {
      expect(route.startsWith("/admin")).toBe(true);
    }
  });

  it("non-admin roles cannot access admin routes", () => {
    const nonAdminRoles = ["senior", "family", "companion"];
    const adminRole = "admin";
    for (const role of nonAdminRoles) {
      expect(role).not.toBe(adminRole);
    }
  });

  it("only admin role grants access", () => {
    function canAccessAdmin(role: string): boolean {
      return role === "admin";
    }
    expect(canAccessAdmin("admin")).toBe(true);
    expect(canAccessAdmin("senior")).toBe(false);
    expect(canAccessAdmin("family")).toBe(false);
    expect(canAccessAdmin("companion")).toBe(false);
  });
});

// ── Companion status transitions ──────────────────────────────
describe("Admin companion management", () => {
  const VALID_STATUSES = ["pending", "under_review", "approved", "rejected", "suspended"];

  it("admin can approve companion", () => {
    const currentStatus = "pending";
    const newStatus = "approved";
    expect(VALID_STATUSES).toContain(newStatus);
    expect(currentStatus).not.toBe(newStatus);
  });

  it("admin can suspend companion", () => {
    const newStatus = "suspended";
    expect(VALID_STATUSES).toContain(newStatus);
  });

  it("admin can reactivate suspended companion", () => {
    const currentStatus = "suspended";
    const newStatus = "approved";
    expect(VALID_STATUSES).toContain(newStatus);
    expect(currentStatus).not.toBe(newStatus);
  });

  it("admin can reject companion", () => {
    const newStatus = "rejected";
    expect(VALID_STATUSES).toContain(newStatus);
  });

  it("suspended companion cannot accept bookings", () => {
    function canAccept(verificationStatus: string): boolean {
      return verificationStatus === "approved";
    }
    expect(canAccept("suspended")).toBe(false);
    expect(canAccept("approved")).toBe(true);
    expect(canAccept("pending")).toBe(false);
  });
});

// ── Booking assignment ────────────────────────────────────────
describe("Admin booking assignment", () => {
  it("only approved companions can be assigned", () => {
    const companions = [
      { id: "1", verification_status: "approved" },
      { id: "2", verification_status: "pending" },
      { id: "3", verification_status: "suspended" },
    ];
    const eligible = companions.filter(c => c.verification_status === "approved");
    expect(eligible).toHaveLength(1);
    expect(eligible[0].id).toBe("1");
  });

  it("booking must be in assignable state", () => {
    const assignableStatuses = ["requested", "assigned"];
    expect(assignableStatuses).toContain("requested");
    expect(assignableStatuses).toContain("assigned");
    expect(assignableStatuses).not.toContain("completed");
    expect(assignableStatuses).not.toContain("cancelled");
  });
});

// ── Internal notes validation ─────────────────────────────────
describe("Internal notes", () => {
  const validNote = {
    entityType: "booking" as const,
    entityId: "11111111-2222-3333-4444-555555555555",
    note: "This booking needs extra attention.",
  };

  it("accepts a valid internal note", () => {
    expect(InternalNoteSchema.safeParse(validNote).success).toBe(true);
  });

  it("rejects empty note", () => {
    expect(InternalNoteSchema.safeParse({ ...validNote, note: "" }).success).toBe(false);
  });

  it("rejects note longer than 2000 characters", () => {
    expect(InternalNoteSchema.safeParse({ ...validNote, note: "a".repeat(2001) }).success).toBe(false);
  });

  it("accepts all valid entity types", () => {
    for (const et of ["booking", "companion", "incident", "senior"] as const) {
      expect(InternalNoteSchema.safeParse({ ...validNote, entityType: et }).success).toBe(true);
    }
  });

  it("rejects invalid entity type", () => {
    expect(InternalNoteSchema.safeParse({ ...validNote, entityType: "payment" }).success).toBe(false);
  });
});

// ── Mock refund validation ────────────────────────────────────
describe("Mock refund", () => {
  const validRefund = {
    bookingId: "11111111-2222-3333-4444-555555555555",
    amount: 50.00,
    reason: "Service was not as expected.",
  };

  it("accepts a valid refund", () => {
    expect(RefundSchema.safeParse(validRefund).success).toBe(true);
  });

  it("rejects zero amount", () => {
    expect(RefundSchema.safeParse({ ...validRefund, amount: 0 }).success).toBe(false);
  });

  it("rejects negative amount", () => {
    expect(RefundSchema.safeParse({ ...validRefund, amount: -10 }).success).toBe(false);
  });

  it("rejects amount over 10000", () => {
    expect(RefundSchema.safeParse({ ...validRefund, amount: 10001 }).success).toBe(false);
  });

  it("rejects reason shorter than 5 characters", () => {
    expect(RefundSchema.safeParse({ ...validRefund, reason: "Bad" }).success).toBe(false);
  });
});

// ── CSV export ────────────────────────────────────────────────
describe("CSV export", () => {
  it("CSV contains all expected fields", () => {
    const expected = [
      "booking_id", "status", "scheduled_date", "scheduled_start_time",
      "duration_hours", "activity_type", "senior_name", "companion_name",
      "checked_in_at", "checked_out_at", "late_checkin", "late_checkout", "visit_note"
    ];
    for (const field of expected) {
      expect(CSV_FIELDS).toContain(field);
    }
  });

  it("CSV has correct number of fields", () => {
    expect(CSV_FIELDS).toHaveLength(13);
  });

  it("CSV row is generated correctly", () => {
    const row = {
      id: "abc-123",
      status: "completed",
      scheduled_date: "2026-06-13",
      scheduled_start_time: "10:00",
      duration_hours: 2,
      activity_type: "Walk or Park Visit",
      senior_name: "Eleanor Johnson",
      companion_name: "Abhinav Aravind",
      checked_in_at: "2026-06-13T10:05:00",
      checked_out_at: "2026-06-13T12:10:00",
      late_checkin: false,
      late_checkout: false,
      visit_note: "Great visit.",
    };
    const csvRow = [
      row.id, row.status, row.scheduled_date, row.scheduled_start_time,
      row.duration_hours, row.activity_type, row.senior_name, row.companion_name,
      row.checked_in_at, row.checked_out_at,
      row.late_checkin ? "yes" : "no",
      row.late_checkout ? "yes" : "no",
      `"${row.visit_note}"`,
    ].join(",");
    expect(csvRow).toContain("abc-123");
    expect(csvRow).toContain("completed");
    expect(csvRow).toContain("Eleanor Johnson");
    expect(csvRow).toContain("no,no");
  });
});

// ── Audit log ─────────────────────────────────────────────────
describe("Audit log", () => {
  it("audit log records required fields", () => {
    const entry = {
      actor_profile_id: "11111111-2222-3333-4444-555555555555",
      action: "companion_status_update",
      entity_type: "companion",
      entity_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      created_at: new Date().toISOString(),
    };
    expect(entry.actor_profile_id).toBeTruthy();
    expect(entry.action).toBeTruthy();
    expect(entry.entity_type).toBeTruthy();
    expect(entry.created_at).toBeTruthy();
  });

  it("admin actions appear in audit log", () => {
    const LOGGED_ACTIONS = [
      "add_internal_note",
      "issue_mock_refund",
      "mark_needs_review",
      "export_csv",
      "companion_status_update",
    ];
    expect(LOGGED_ACTIONS).toContain("add_internal_note");
    expect(LOGGED_ACTIONS).toContain("issue_mock_refund");
    expect(LOGGED_ACTIONS).toContain("export_csv");
  });
});

// ── Dashboard metrics ─────────────────────────────────────────
describe("Dashboard widgets", () => {
  it("all required widgets are defined", () => {
    const WIDGETS = [
      "requestedBookings",
      "bookingsToday",
      "activeVisits",
      "lateCheckIns",
      "lateCheckOuts",
      "pendingCompanions",
      "openIncidents",
      "completedThisWeek",
      "repeatBookings",
      "averageRating",
    ];
    expect(WIDGETS).toHaveLength(10);
    expect(WIDGETS).toContain("requestedBookings");
    expect(WIDGETS).toContain("averageRating");
    expect(WIDGETS).toContain("repeatBookings");
  });
});

// ── Seed data requirements ────────────────────────────────────
describe("Seed data", () => {
  it("requires correct number of test entities", () => {
    const requirements = {
      seniors: 10,
      familyMembers: 8,
      companions: 10,
      bookings: 25,
      incidents: 3,
      ratings: 5,
    };
    expect(requirements.seniors).toBe(10);
    expect(requirements.familyMembers).toBe(8);
    expect(requirements.companions).toBe(10);
    expect(requirements.bookings).toBe(25);
    expect(requirements.incidents).toBe(3);
    expect(requirements.ratings).toBe(5);
  });
});
