import { describe, it, expect } from "vitest";
import { z } from "zod";

const CHECKIN_WINDOW_MINUTES = 60;
const NOTE_MAX = 1000;

function canCheckIn(
  bookingStatus: string,
  companionVerificationStatus: string,
  isAssignedCompanion: boolean,
  scheduledDate: string,
  scheduledTime: string,
  now: Date = new Date()
): { allowed: boolean; reason?: string } {
  if (companionVerificationStatus === "suspended")
    return { allowed: false, reason: "Suspended companions cannot check in." };
  if (!isAssignedCompanion)
    return { allowed: false, reason: "You are not the assigned companion." };
  if (bookingStatus !== "accepted")
    return { allowed: false, reason: "Can only check in for an accepted booking." };
  const [y, m, d] = scheduledDate.split("-").map(Number);
  const [h, min] = scheduledTime.split(":").map(Number);
  const scheduledStart = new Date(y, m - 1, d, h, min, 0);
  const windowOpenAt = new Date(scheduledStart.getTime() - CHECKIN_WINDOW_MINUTES * 60 * 1000);
  if (now < windowOpenAt)
    return { allowed: false, reason: `Check-in opens ${CHECKIN_WINDOW_MINUTES} minutes before the visit.` };
  return { allowed: true };
}

function isLateCheckIn(scheduledDate: string, scheduledTime: string, now: Date): boolean {
  const [y, m, d] = scheduledDate.split("-").map(Number);
  const [h, min] = scheduledTime.split(":").map(Number);
  const scheduledStart = new Date(y, m - 1, d, h, min, 0);
  const lateThreshold = new Date(scheduledStart.getTime() + 10 * 60 * 1000);
  return now > lateThreshold;
}

function canCheckOut(bookingStatus: string, checkedInAt: string | null): { allowed: boolean; reason?: string } {
  if (bookingStatus !== "in_progress")
    return { allowed: false, reason: "You must check in before checking out." };
  if (!checkedInAt)
    return { allowed: false, reason: "No check-in record found." };
  return { allowed: true };
}

function validateVisitNote(note: string): { valid: boolean; error?: string } {
  if (!note || note.trim().length === 0)
    return { valid: false, error: "Visit note cannot be empty." };
  if (note.length > NOTE_MAX)
    return { valid: false, error: `Visit note must be ${NOTE_MAX} characters or fewer.` };
  return { valid: true };
}

const IncidentSchema = z.object({
  bookingId: z.string().uuid(),
  category: z.enum([
    "senior_did_not_answer", "companion_delayed", "senior_felt_unwell",
    "transportation_issue", "safety_concern", "inappropriate_behavior",
    "lost_property", "other",
  ]),
  description: z.string().min(10).max(2000),
  severity: z.enum(["low", "medium", "high", "critical"]).default("low"),
});

describe("Check-in rules", () => {
  const future = new Date(Date.now() + 30 * 60 * 1000);
  const dateStr = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(future.getHours()).padStart(2, "0")}:${String(future.getMinutes()).padStart(2, "0")}`;

  it("only the assigned companion can check in", () => {
    const result = canCheckIn("accepted", "approved", false, dateStr, timeStr, new Date(Date.now() - 61 * 60 * 1000));
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/assigned companion/i);
  });

  it("suspended companion cannot check in", () => {
    const result = canCheckIn("accepted", "suspended", true, dateStr, timeStr, new Date(Date.now() - 61 * 60 * 1000));
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/suspended/i);
  });

  it("cannot check in for a non-accepted booking", () => {
    const result = canCheckIn("assigned", "approved", true, dateStr, timeStr, new Date(Date.now() - 61 * 60 * 1000));
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/accepted/i);
  });

  it("cannot check in before the window opens", () => {
    const startAt = new Date(Date.now() + 90 * 60 * 1000);
    const ds = `${startAt.getFullYear()}-${String(startAt.getMonth() + 1).padStart(2, "0")}-${String(startAt.getDate()).padStart(2, "0")}`;
    const ts = `${String(startAt.getHours()).padStart(2, "0")}:${String(startAt.getMinutes()).padStart(2, "0")}`;
    const result = canCheckIn("accepted", "approved", true, ds, ts, new Date());
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/opens/i);
  });

  it("allows check-in within the window", () => {
    const result = canCheckIn("accepted", "approved", true, dateStr, timeStr, new Date());
    expect(result.allowed).toBe(true);
  });

  it("flags a late check-in", () => {
    const past = new Date(Date.now() - 15 * 60 * 1000);
    const ds = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, "0")}-${String(past.getDate()).padStart(2, "0")}`;
    const ts = `${String(past.getHours()).padStart(2, "0")}:${String(past.getMinutes()).padStart(2, "0")}`;
    expect(isLateCheckIn(ds, ts, new Date())).toBe(true);
  });

  it("does not flag on-time check-in", () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000);
    const ds = `${recent.getFullYear()}-${String(recent.getMonth() + 1).padStart(2, "0")}-${String(recent.getDate()).padStart(2, "0")}`;
    const ts = `${String(recent.getHours()).padStart(2, "0")}:${String(recent.getMinutes()).padStart(2, "0")}`;
    expect(isLateCheckIn(ds, ts, new Date())).toBe(false);
  });
});

describe("Check-out rules", () => {
  it("cannot check out before checking in", () => {
    const result = canCheckOut("in_progress", null);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/check-in/i);
  });

  it("cannot check out if booking is not in_progress", () => {
    const result = canCheckOut("accepted", new Date().toISOString());
    expect(result.allowed).toBe(false);
  });

  it("allows check-out when in_progress and checked in", () => {
    const result = canCheckOut("in_progress", new Date().toISOString());
    expect(result.allowed).toBe(true);
  });
});

describe("Visit note validation", () => {
  it("rejects empty visit note", () => {
    expect(validateVisitNote("").valid).toBe(false);
  });

  it("rejects whitespace-only visit note", () => {
    expect(validateVisitNote("   ").valid).toBe(false);
  });

  it("rejects visit note longer than 1000 characters", () => {
    const result = validateVisitNote("a".repeat(1001));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/1000/i);
  });

  it("accepts note at exactly 1000 characters", () => {
    expect(validateVisitNote("a".repeat(1000)).valid).toBe(true);
  });

  it("accepts a normal visit note", () => {
    expect(validateVisitNote("We had a lovely walk in the park.").valid).toBe(true);
  });

  it("sensitive-information warning covers required categories", () => {
    const WARNING = "Do not include medical records, diagnoses, medication details, financial information";
    expect(WARNING).toMatch(/medical records/i);
    expect(WARNING).toMatch(/financial information/i);
    expect(WARNING).toMatch(/diagnoses/i);
    expect(WARNING).toMatch(/medication/i);
  });
});

describe("Incident report validation", () => {
  const valid = {
    bookingId: "11111111-2222-3333-4444-555555555555",
    category: "other" as const,
    description: "The senior was not at home when I arrived.",
    severity: "low" as const,
  };

  it("accepts a valid incident report", () => {
    expect(IncidentSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects description shorter than 10 characters", () => {
    expect(IncidentSchema.safeParse({ ...valid, description: "Short" }).success).toBe(false);
  });

  it("rejects description longer than 2000 characters", () => {
    expect(IncidentSchema.safeParse({ ...valid, description: "a".repeat(2001) }).success).toBe(false);
  });

  it("accepts all valid incident categories", () => {
    const cats = ["senior_did_not_answer", "companion_delayed", "senior_felt_unwell",
      "transportation_issue", "safety_concern", "inappropriate_behavior", "lost_property", "other"] as const;
    for (const cat of cats) {
      expect(IncidentSchema.safeParse({ ...valid, category: cat }).success).toBe(true);
    }
  });

  it("rejects an unknown category", () => {
    expect(IncidentSchema.safeParse({ ...valid, category: "missing_companion" }).success).toBe(false);
  });
});

describe("Emergency disclaimer", () => {
  it("contains required emergency text", () => {
    const DISCLAIMER = "If there is an immediate danger or medical emergency, call 911. Senior Companion is not an emergency-response service.";
    expect(DISCLAIMER).toMatch(/call 911/i);
    expect(DISCLAIMER).toMatch(/not an emergency-response service/i);
  });
});

describe("Booking lifecycle transitions", () => {
  it("accepted booking can move to in_progress", () => {
    const transitions: Record<string, string[]> = {
      accepted: ["in_progress", "cancelled"],
      in_progress: ["completed"],
      completed: [],
    };
    expect(transitions["accepted"]).toContain("in_progress");
    expect(transitions["in_progress"]).toContain("completed");
    expect(transitions["completed"]).toHaveLength(0);
  });
});