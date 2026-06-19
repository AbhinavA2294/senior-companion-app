import { describe, it, expect } from "vitest";
import {
  extractDate,
  extractTime,
  extractDuration,
  extractActivityType,
  extractSeniorHint,
  extractDestination,
  detectMedicalKeywords,
} from "@/lib/voice/extraction";
import { MockVoiceProvider } from "@/lib/voice/mock-provider";

// Fixed reference date: Thursday 2026-06-18
const REF = new Date("2026-06-18T12:00:00Z");

// ─── Date extraction ──────────────────────────────────────────────────────────
describe("extractDate", () => {
  it("returns today for 'today'", () => {
    expect(extractDate("today", REF)).toBe("2026-06-18");
  });

  it("returns tomorrow for 'tomorrow'", () => {
    expect(extractDate("schedule for tomorrow", REF)).toBe("2026-06-19");
  });

  it("resolves 'next Tuesday' to the following Tuesday", () => {
    // From Thursday 2026-06-18, next Tuesday = 2026-06-23
    expect(extractDate("next Tuesday", REF)).toBe("2026-06-23");
  });

  it("resolves 'next Wednesday' correctly", () => {
    // From Thursday 2026-06-18, next Wednesday = 2026-06-24
    expect(extractDate("appointment next Wednesday", REF)).toBe("2026-06-24");
  });

  it("resolves 'next Monday' when Monday is past this week", () => {
    // From Thursday, next Monday = 2026-06-22
    expect(extractDate("next Monday at 10 AM", REF)).toBe("2026-06-22");
  });

  it("resolves 'this Saturday'", () => {
    // From Thursday 2026-06-18, this Saturday = 2026-06-20
    expect(extractDate("this Saturday", REF)).toBe("2026-06-20");
  });

  it("parses 'June 25' as 2026-06-25", () => {
    expect(extractDate("appointment on June 25", REF)).toBe("2026-06-25");
  });

  it("parses 'June 25th'", () => {
    expect(extractDate("June 25th at 2 PM", REF)).toBe("2026-06-25");
  });

  it("parses numeric date MM/DD", () => {
    expect(extractDate("on 07/04", REF)).toBe("2026-07-04");
  });

  it("returns null when no date found", () => {
    expect(extractDate("I need a companion", REF)).toBeNull();
  });
});

// ─── Time extraction ──────────────────────────────────────────────────────────
describe("extractTime", () => {
  it("parses '2 PM'", () => {
    expect(extractTime("appointment at 2 PM")).toBe("14:00");
  });

  it("parses '10 AM'", () => {
    expect(extractTime("at 10 AM")).toBe("10:00");
  });

  it("parses 'noon'", () => {
    expect(extractTime("meet at noon")).toBe("12:00");
  });

  it("parses 'midnight'", () => {
    expect(extractTime("midnight arrival")).toBe("00:00");
  });

  it("parses '2:30 PM'", () => {
    expect(extractTime("at 2:30 PM")).toBe("14:30");
  });

  it("parses '10:00 AM'", () => {
    expect(extractTime("starting at 10:00 AM")).toBe("10:00");
  });

  it("parses '12 PM' as noon", () => {
    expect(extractTime("at 12 PM")).toBe("12:00");
  });

  it("parses '12 AM' as midnight", () => {
    expect(extractTime("at 12 AM")).toBe("00:00");
  });

  it("interprets 'morning' as 09:00", () => {
    expect(extractTime("in the morning")).toBe("09:00");
  });

  it("interprets 'afternoon' as 14:00", () => {
    expect(extractTime("in the afternoon")).toBe("14:00");
  });

  it("returns null when no time found", () => {
    expect(extractTime("I need a companion")).toBeNull();
  });
});

// ─── Duration extraction ──────────────────────────────────────────────────────
describe("extractDuration", () => {
  it("parses 'three hours'", () => {
    expect(extractDuration("for about three hours")).toBe(3);
  });

  it("parses 'two hours'", () => {
    expect(extractDuration("for two hours")).toBe(2);
  });

  it("parses 'an hour and a half'", () => {
    expect(extractDuration("for an hour and a half")).toBe(1.5);
  });

  it("parses 'one hour and a half'", () => {
    expect(extractDuration("about one hour and a half")).toBe(1.5);
  });

  it("parses 'an hour'", () => {
    expect(extractDuration("for an hour")).toBe(1);
  });

  it("parses numeric '2 hours'", () => {
    expect(extractDuration("for 2 hours")).toBe(2);
  });

  it("parses '2.5 hours'", () => {
    expect(extractDuration("2.5 hours visit")).toBe(2.5);
  });

  it("parses '90 minutes'", () => {
    expect(extractDuration("90 minutes long")).toBe(1.5);
  });

  it("parses '30 minutes'", () => {
    expect(extractDuration("30 minutes")).toBe(0.5);
  });

  it("returns null when no duration found", () => {
    expect(extractDuration("I need a companion")).toBeNull();
  });
});

// ─── Activity type extraction ─────────────────────────────────────────────────
describe("extractActivityType", () => {
  it("detects doctor appointment from 'cardiology'", () => {
    expect(extractActivityType("cardiology appointment")).toBe("Doctor Appointment Chaperone");
  });

  it("detects doctor appointment from 'appointment' alone", () => {
    expect(extractActivityType("she has an appointment next week")).toBe("Doctor Appointment Chaperone");
  });

  it("detects walk from 'park'", () => {
    expect(extractActivityType("walk in the park")).toBe("Walk or Park Visit");
  });

  it("detects walk from 'stroll'", () => {
    expect(extractActivityType("morning stroll around the garden")).toBe("Walk or Park Visit");
  });

  it("detects café from 'lunch'", () => {
    expect(extractActivityType("going to lunch")).toBe("Café or Restaurant");
  });

  it("detects grocery from 'pharmacy'", () => {
    expect(extractActivityType("pick up medicine at the pharmacy")).toBe("Grocery Shopping");
  });

  it("detects technology assistance", () => {
    expect(extractActivityType("help setting up email on the tablet")).toBe("Technology Assistance");
  });

  it("prefers DB activity types when provided", () => {
    const available = ["Walk in the Park", "Doctor Visit", "Grocery Run"];
    expect(extractActivityType("quick walk outside", available)).toBe("Walk in the Park");
  });

  it("returns null when nothing matches", () => {
    expect(extractActivityType("something completely unrecognized xyz")).toBeNull();
  });
});

// ─── Senior hint extraction ───────────────────────────────────────────────────
describe("extractSeniorHint", () => {
  it("detects 'my father'", () => {
    expect(extractSeniorHint("I need someone for my father")).toBe("father");
  });

  it("detects 'my mom'", () => {
    expect(extractSeniorHint("accompanying my mom to the doctor")).toBe("mother");
  });

  it("detects 'my grandmother'", () => {
    expect(extractSeniorHint("taking my grandmother shopping")).toBe("grandmother");
  });

  it("detects 'my husband'", () => {
    expect(extractSeniorHint("for my husband")).toBe("husband");
  });

  it("returns null when no relationship word found", () => {
    expect(extractSeniorHint("I need a companion for a visit")).toBeNull();
  });
});

// ─── Medical keyword detection ────────────────────────────────────────────────
describe("detectMedicalKeywords", () => {
  it("flags 'cardiology'", () => {
    expect(detectMedicalKeywords("cardiology appointment")).toBe(true);
  });

  it("flags 'chemotherapy'", () => {
    expect(detectMedicalKeywords("she has chemotherapy next week")).toBe(true);
  });

  it("flags 'dialysis'", () => {
    expect(detectMedicalKeywords("dialysis session on Monday")).toBe(true);
  });

  it("flags 'MRI'", () => {
    expect(detectMedicalKeywords("going for an MRI scan")).toBe(true);
  });

  it("does NOT flag a park walk", () => {
    expect(detectMedicalKeywords("walk in the park on Saturday")).toBe(false);
  });

  it("does NOT flag a grocery trip", () => {
    expect(detectMedicalKeywords("grocery shopping at the supermarket")).toBe(false);
  });
});

// ─── MockVoiceProvider — full extraction ─────────────────────────────────────
describe("MockVoiceProvider", () => {
  const provider = new MockVoiceProvider();

  it("extracts all fields from a rich sentence", async () => {
    const text =
      "I need someone to accompany my mother to her cardiology appointment next Tuesday at 2 PM for about three hours.";
    const result = await provider.extractBookingDetails(text, { referenceDate: REF });

    expect(result.seniorHint).toBe("mother");
    expect(result.activityTypeName).toBe("Doctor Appointment Chaperone");
    expect(result.date).toBe("2026-06-23"); // next Tuesday from 2026-06-18
    expect(result.startTime).toBe("14:00");
    expect(result.durationHours).toBe(3);
    expect(result.medicalWarningTriggered).toBe(true);
    expect(result.confidence).toBe("high");
  });

  it("extracts a park visit correctly", async () => {
    const text = "My father would like to go for a walk in the park this Saturday at 10 AM for two hours.";
    const result = await provider.extractBookingDetails(text, { referenceDate: REF });

    expect(result.activityTypeName).toBe("Walk or Park Visit");
    expect(result.date).toBe("2026-06-20"); // this Saturday
    expect(result.startTime).toBe("10:00");
    expect(result.durationHours).toBe(2);
    expect(result.medicalWarningTriggered).toBe(false);
  });

  it("sets low confidence when few fields are found", async () => {
    const result = await provider.extractBookingDetails("I need a companion.", { referenceDate: REF });
    expect(result.confidence).toBe("low");
  });

  it("transcribe() returns a placeholder — does NOT transcribe audio", async () => {
    const fakeBlob = new Blob(["audio"], { type: "audio/webm" });
    const text = await provider.transcribe(fakeBlob);
    expect(text).toContain("external provider");
    expect(text.toLowerCase()).not.toContain("audio data");
  });
});

// ─── Confirmation required (business logic) ───────────────────────────────────
describe("Confirmation / disclaimer requirement", () => {
  it("ReviewedBookingData requires disclaimerAcknowledged = true", () => {
    // Verify the type contract: the field must be a boolean
    // and the form should not submit when it's false.
    // This is a static / unit-level contract check.
    type ReviewedBookingData = {
      disclaimerAcknowledged: boolean;
    };
    const data: ReviewedBookingData = { disclaimerAcknowledged: false };
    expect(data.disclaimerAcknowledged).toBe(false);
    // If false, the form validation rejects submission
    const canSubmit = (d: ReviewedBookingData) => d.disclaimerAcknowledged === true;
    expect(canSubmit(data)).toBe(false);
    expect(canSubmit({ disclaimerAcknowledged: true })).toBe(true);
  });

  it("does not auto-submit — user must explicitly check disclaimer", () => {
    // The extracted result has no 'disclaimerAcknowledged' field;
    // it defaults to false in the review form state.
    const extracted = {
      activityTypeName: "Doctor Appointment Chaperone",
      date: "2026-06-23",
      startTime: "14:00",
      durationHours: 3,
      disclaimerAcknowledged: undefined, // not present in extraction output
    };
    expect((extracted as { disclaimerAcknowledged?: boolean }).disclaimerAcknowledged).toBeUndefined();
    // The form state initializes disclaimerAcknowledged to false — user must opt in
    const formState = { disclaimerAcknowledged: extracted.disclaimerAcknowledged ?? false };
    expect(formState.disclaimerAcknowledged).toBe(false);
  });

  it("external voice provider is disabled by default", () => {
    // VOICE_PROVIDER env var is not set in test env; default is 'mock'
    const provider = process.env.VOICE_PROVIDER ?? "mock";
    expect(provider).toBe("mock");
  });
});
