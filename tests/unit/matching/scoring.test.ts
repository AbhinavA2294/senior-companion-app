import { describe, it, expect } from "vitest";
import {
  scoreCompanion,
  scoreLanguage,
  scoreActivity,
  scoreInterests,
  scoreRating,
  scoreExperience,
  scoreDistance,
  scoreCancellation,
  computeTotalScore,
} from "@/lib/matching/scoring";
import { DEFAULT_WEIGHTS } from "@/lib/matching/config";
import { MockLLMExplainer } from "@/lib/matching/llm/mock-provider";
import type { CompanionInput, BookingInput, SeniorInput, ExplainerInput } from "@/lib/matching/types";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const baseBooking: BookingInput = {
  id: "booking-001",
  activityTypeName: "Doctor Appointment Chaperone",
  scheduledDate: "2026-06-25", // Wednesday
  scheduledStartTime: "10:00",
  durationHours: 2,
  seniorProfileId: "senior-001",
};

const baseSenior: SeniorInput = {
  preferredLanguage: "Tamil",
  additionalLanguages: ["English"],
  interests: ["Gardening", "Chess", "Reading"],
  preferredCompanionGender: null,
};

function makeCompanion(overrides: Partial<CompanionInput> = {}): CompanionInput {
  return {
    id: "cp-001",
    profileId: "p-001",
    firstName: "Alex",
    lastName: "Rivera",
    verificationStatus: "approved",
    maxTravelMiles: 15,
    languagesSpoken: ["English", "Tamil"],
    activityPreferences: ["Doctor Appointment"],
    activitiesSupported: ["Medical Chaperone"],
    interests: ["Reading", "Music"],
    availableForBooking: true,
    hasOverlappingBooking: false,
    declinedThisBooking: false,
    avgRating: 4.8,
    completedVisitsCount: 12,
    completedVisitsWithSenior: 0,
    recentDeclineCount: 0,
    ...overrides,
  };
}

// ── Hard Exclusion Tests ──────────────────────────────────────────────────────

describe("Hard exclusions", () => {
  it("excludes a suspended companion", () => {
    const companion = makeCompanion({ verificationStatus: "suspended" });
    const result = scoreCompanion(companion, baseBooking, baseSenior, DEFAULT_WEIGHTS);
    expect(result.included).toBe(false);
    if (!result.included) {
      expect(result.excluded.reasons).toContain("Companion is suspended");
    }
  });

  it("excludes an unapproved companion (pending status)", () => {
    const companion = makeCompanion({ verificationStatus: "pending" });
    const result = scoreCompanion(companion, baseBooking, baseSenior, DEFAULT_WEIGHTS);
    expect(result.included).toBe(false);
    if (!result.included) {
      expect(result.excluded.reasons.some((r) => r.includes("not approved"))).toBe(true);
    }
  });

  it("excludes a rejected companion", () => {
    const companion = makeCompanion({ verificationStatus: "rejected" });
    const result = scoreCompanion(companion, baseBooking, baseSenior, DEFAULT_WEIGHTS);
    expect(result.included).toBe(false);
  });

  it("excludes a companion who is unavailable", () => {
    const companion = makeCompanion({ availableForBooking: false });
    const result = scoreCompanion(companion, baseBooking, baseSenior, DEFAULT_WEIGHTS);
    expect(result.included).toBe(false);
    if (!result.included) {
      expect(result.excluded.reasons.some((r) => r.toLowerCase().includes("unavailable"))).toBe(true);
    }
  });

  it("excludes a companion with an overlapping booking", () => {
    const companion = makeCompanion({ hasOverlappingBooking: true });
    const result = scoreCompanion(companion, baseBooking, baseSenior, DEFAULT_WEIGHTS);
    expect(result.included).toBe(false);
    if (!result.included) {
      expect(result.excluded.reasons.some((r) => r.toLowerCase().includes("overlapping"))).toBe(true);
    }
  });

  it("excludes a companion who declined this booking", () => {
    const companion = makeCompanion({ declinedThisBooking: true });
    const result = scoreCompanion(companion, baseBooking, baseSenior, DEFAULT_WEIGHTS);
    expect(result.included).toBe(false);
    if (!result.included) {
      expect(result.excluded.reasons.some((r) => r.toLowerCase().includes("declined"))).toBe(true);
    }
  });

  it("includes the exclusion reason even when suspension plus other flags set", () => {
    const companion = makeCompanion({
      verificationStatus: "suspended",
      availableForBooking: false,
    });
    const result = scoreCompanion(companion, baseBooking, baseSenior, DEFAULT_WEIGHTS);
    expect(result.included).toBe(false);
    if (!result.included) {
      expect(result.excluded.reasons.length).toBeGreaterThan(0);
    }
  });
});

// ── Language Scoring ──────────────────────────────────────────────────────────

describe("scoreLanguage", () => {
  it("returns 1.0 when companion speaks the preferred language", () => {
    expect(scoreLanguage(["Tamil", "English"], "Tamil", [])).toBe(1.0);
  });

  it("is case-insensitive", () => {
    expect(scoreLanguage(["tamil"], "Tamil", [])).toBe(1.0);
  });

  it("returns 0.5 when companion speaks an additional language of the senior", () => {
    expect(scoreLanguage(["English"], "Tamil", ["English"])).toBe(0.5);
  });

  it("returns 0.0 when there is no language match", () => {
    expect(scoreLanguage(["Spanish"], "Tamil", ["English"])).toBe(0.0);
  });

  it("language match increases total score", () => {
    const withMatch = makeCompanion({ languagesSpoken: ["Tamil", "English"] });
    const withoutMatch = makeCompanion({ languagesSpoken: ["Spanish"] });

    const rWith = scoreCompanion(withMatch, baseBooking, baseSenior, DEFAULT_WEIGHTS);
    const rWithout = scoreCompanion(withoutMatch, baseBooking, baseSenior, DEFAULT_WEIGHTS);

    expect(rWith.included).toBe(true);
    expect(rWithout.included).toBe(true);
    if (rWith.included && rWithout.included) {
      expect(rWith.candidate.totalScore).toBeGreaterThan(rWithout.candidate.totalScore);
    }
  });
});

// ── Activity Scoring ──────────────────────────────────────────────────────────

describe("scoreActivity", () => {
  it("returns 1.0 for an exact substring match", () => {
    expect(scoreActivity(["Doctor Appointment"], [], "Doctor Appointment Chaperone")).toBe(1.0);
  });

  it("returns 0.5 for a keyword match", () => {
    expect(scoreActivity(["appointment scheduling"], [], "Doctor Appointment Chaperone")).toBe(0.5);
  });

  it("returns 0.0 when there is no match", () => {
    expect(scoreActivity(["Gardening"], [], "Doctor Appointment Chaperone")).toBe(0.0);
  });
});

// ── Interest Scoring ─────────────────────────────────────────────────────────

describe("scoreInterests", () => {
  it("returns 1.0 for full overlap on 3 interests", () => {
    expect(scoreInterests(["Reading", "Chess", "Gardening"], ["Gardening", "Chess", "Reading"])).toBe(1.0);
  });

  it("returns 0.0 when either side has no interests", () => {
    expect(scoreInterests([], ["Gardening"])).toBe(0.0);
    expect(scoreInterests(["Reading"], [])).toBe(0.0);
  });

  it("partial overlap produces a score between 0 and 1", () => {
    const score = scoreInterests(["Reading"], ["Gardening", "Chess", "Reading"]);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// ── Rating Scoring ────────────────────────────────────────────────────────────

describe("scoreRating", () => {
  it("maps 5 stars to 1.0", () => {
    expect(scoreRating(5)).toBeCloseTo(1.0);
  });

  it("maps 1 star to 0.0", () => {
    expect(scoreRating(1)).toBeCloseTo(0.0);
  });

  it("returns 0.7 (neutral) for null (no ratings)", () => {
    expect(scoreRating(null)).toBe(0.7);
  });

  it("high rating produces higher score than low rating", () => {
    expect(scoreRating(4.8)).toBeGreaterThan(scoreRating(3.0));
  });
});

// ── Experience Scoring ────────────────────────────────────────────────────────

describe("scoreExperience", () => {
  it("returns 0 for a companion with 0 completed visits", () => {
    expect(scoreExperience(0)).toBe(0);
  });

  it("returns 1.0 at or above the experienceMaxVisits cap", () => {
    expect(scoreExperience(50)).toBe(1.0);
    expect(scoreExperience(100)).toBe(1.0);
  });

  it("is proportional for mid-range counts", () => {
    expect(scoreExperience(25)).toBeCloseTo(0.5);
  });
});

// ── Distance Scoring ──────────────────────────────────────────────────────────

describe("scoreDistance", () => {
  it("returns 1.0 for a companion willing to travel 25+ miles", () => {
    expect(scoreDistance(25)).toBe(1.0);
  });

  it("returns a lower score for small service radius", () => {
    expect(scoreDistance(5)).toBeLessThan(scoreDistance(15));
  });

  it("distance affects overall ranking", () => {
    const farReach = makeCompanion({ maxTravelMiles: 30, languagesSpoken: ["Spanish"], avgRating: 4.0, completedVisitsCount: 5 });
    const nearReach = makeCompanion({ id: "cp-002", maxTravelMiles: 3, languagesSpoken: ["Spanish"], avgRating: 4.0, completedVisitsCount: 5 });

    const rFar = scoreCompanion(farReach, baseBooking, baseSenior, DEFAULT_WEIGHTS);
    const rNear = scoreCompanion(nearReach, baseBooking, baseSenior, DEFAULT_WEIGHTS);

    expect(rFar.included && rNear.included).toBe(true);
    if (rFar.included && rNear.included) {
      expect(rFar.candidate.totalScore).toBeGreaterThan(rNear.candidate.totalScore);
    }
  });
});

// ── Cancellation Scoring ─────────────────────────────────────────────────────

describe("scoreCancellation", () => {
  it("returns 1.0 for zero recent declines", () => {
    expect(scoreCancellation(0)).toBe(1.0);
  });

  it("degrades with more declines", () => {
    expect(scoreCancellation(1)).toBeLessThan(scoreCancellation(0));
    expect(scoreCancellation(2)).toBeLessThan(scoreCancellation(1));
    expect(scoreCancellation(3)).toBeLessThan(scoreCancellation(2));
  });
});

// ── Repeat Booking Preference ─────────────────────────────────────────────────

describe("Repeat booking", () => {
  it("companion with prior visit to this senior ranks higher", () => {
    const withHistory = makeCompanion({ completedVisitsWithSenior: 3, languagesSpoken: ["Spanish"] });
    const withoutHistory = makeCompanion({ id: "cp-002", completedVisitsWithSenior: 0, languagesSpoken: ["Spanish"] });

    const rWith = scoreCompanion(withHistory, baseBooking, baseSenior, DEFAULT_WEIGHTS);
    const rWithout = scoreCompanion(withoutHistory, baseBooking, baseSenior, DEFAULT_WEIGHTS);

    expect(rWith.included && rWithout.included).toBe(true);
    if (rWith.included && rWithout.included) {
      expect(rWith.candidate.totalScore).toBeGreaterThan(rWithout.candidate.totalScore);
    }
  });
});

// ── Score Breakdown Visibility ────────────────────────────────────────────────

describe("Score breakdown", () => {
  it("every included candidate exposes a full ScoreBreakdown", () => {
    const companion = makeCompanion();
    const result = scoreCompanion(companion, baseBooking, baseSenior, DEFAULT_WEIGHTS);
    expect(result.included).toBe(true);
    if (result.included) {
      const bd = result.candidate.scoreBreakdown;
      const keys: Array<keyof typeof bd> = [
        "language", "activity", "interests", "rating",
        "experience", "repeatBooking", "distance",
        "genderPreference", "cancellation",
      ];
      for (const k of keys) {
        expect(typeof bd[k]).toBe("number");
        expect(bd[k]).toBeGreaterThanOrEqual(0);
        expect(bd[k]).toBeLessThanOrEqual(1);
      }
    }
  });

  it("totalScore is between 0 and 100", () => {
    const companion = makeCompanion();
    const result = scoreCompanion(companion, baseBooking, baseSenior, DEFAULT_WEIGHTS);
    expect(result.included).toBe(true);
    if (result.included) {
      expect(result.candidate.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.candidate.totalScore).toBeLessThanOrEqual(100);
    }
  });

  it("explanationFactors is a non-empty array of strings", () => {
    const companion = makeCompanion();
    const result = scoreCompanion(companion, baseBooking, baseSenior, DEFAULT_WEIGHTS);
    expect(result.included).toBe(true);
    if (result.included) {
      expect(Array.isArray(result.candidate.explanationFactors)).toBe(true);
      expect(result.candidate.explanationFactors.length).toBeGreaterThan(0);
      for (const f of result.candidate.explanationFactors) {
        expect(typeof f).toBe("string");
      }
    }
  });
});

// ── computeTotalScore ─────────────────────────────────────────────────────────

describe("computeTotalScore", () => {
  it("returns 0 when all factor scores are 0", () => {
    const zeroBreakdown = {
      language: 0, activity: 0, interests: 0, rating: 0, experience: 0,
      repeatBooking: 0, distance: 0, genderPreference: 0, cancellation: 1,
    };
    expect(computeTotalScore(zeroBreakdown, DEFAULT_WEIGHTS, false)).toBe(0);
  });

  it("returns 100 when all factor scores are 1 and no cancellation penalty", () => {
    const perfectBreakdown = {
      language: 1, activity: 1, interests: 1, rating: 1, experience: 1,
      repeatBooking: 1, distance: 1, genderPreference: 1, cancellation: 1,
    };
    expect(computeTotalScore(perfectBreakdown, DEFAULT_WEIGHTS, false)).toBe(100);
  });

  it("never returns negative", () => {
    const worstBreakdown = {
      language: 0, activity: 0, interests: 0, rating: 0, experience: 0,
      repeatBooking: 0, distance: 0, genderPreference: 0, cancellation: 0,
    };
    expect(computeTotalScore(worstBreakdown, DEFAULT_WEIGHTS, false)).toBeGreaterThanOrEqual(0);
  });
});

// ── Administrator retains final decision ──────────────────────────────────────

describe("Admin control — no auto-assignment", () => {
  it("scoreCompanion returns a score, not an assignment action", () => {
    const companion = makeCompanion();
    const result = scoreCompanion(companion, baseBooking, baseSenior, DEFAULT_WEIGHTS);
    // The result is advisory data only — no booking mutation is performed
    expect(result.included).toBe(true);
    if (result.included) {
      // Result has a score and breakdown; it does not contain any mutation
      expect(typeof result.candidate.totalScore).toBe("number");
      expect(result.candidate).not.toHaveProperty("assigned");
      expect(result.candidate).not.toHaveProperty("bookingUpdated");
    }
  });

  it("excluded candidates carry reasons, not auto-decisions", () => {
    const suspended = makeCompanion({ verificationStatus: "suspended" });
    const result = scoreCompanion(suspended, baseBooking, baseSenior, DEFAULT_WEIGHTS);
    expect(result.included).toBe(false);
    if (!result.included) {
      expect(Array.isArray(result.excluded.reasons)).toBe(true);
      expect(result.excluded.reasons.length).toBeGreaterThan(0);
      // No mutation fields
      expect(result.excluded).not.toHaveProperty("bookingUpdated");
    }
  });
});

// ── Sensitive information not passed to mock LLM ─────────────────────────────

describe("LLM adapter — PII isolation", () => {
  it("ExplainerInput contains no senior PII", async () => {
    const explainer = new MockLLMExplainer();
    const input: ExplainerInput = {
      companionFirstName: "Alex",      // companion first name only — not a senior field
      activityTypeName: "Doctor Appointment Chaperone",
      rank: 1,
      factors: ["speaks Tamil", "4.8-star rating"],
    };

    // Verify input has no senior-identifying fields
    expect(input).not.toHaveProperty("seniorName");
    expect(input).not.toHaveProperty("seniorId");
    expect(input).not.toHaveProperty("seniorProfileId");
    expect(input).not.toHaveProperty("bookingId");
    expect(input).not.toHaveProperty("healthInfo");
    expect(input).not.toHaveProperty("medicalAlertInfo");
    expect(input).not.toHaveProperty("preferredCompanionGender");

    const explanation = await explainer.generateExplanation(input);
    expect(typeof explanation).toBe("string");
    expect(explanation.length).toBeGreaterThan(0);
    // Explanation should mention the companion first name and activity, not senior PII
    expect(explanation).toContain("Alex");
    expect(explanation).not.toMatch(/senior-001|booking-001/i);
  });

  it("mock LLM generates a non-empty plain-language explanation", async () => {
    const explainer = new MockLLMExplainer();
    const explanation = await explainer.generateExplanation({
      companionFirstName: "Sam",
      activityTypeName: "Walk or Park Visit",
      rank: 1,
      factors: ["speaks Tamil", "experienced with Walk or Park Visit", "4.9-star rating"],
    });
    expect(explanation).toContain("Sam");
    expect(explanation.length).toBeGreaterThan(20);
  });

  it("mock LLM handles empty factors gracefully", async () => {
    const explainer = new MockLLMExplainer();
    const explanation = await explainer.generateExplanation({
      companionFirstName: "Jordan",
      activityTypeName: "Café or Restaurant",
      rank: 3,
      factors: [],
    });
    expect(typeof explanation).toBe("string");
    expect(explanation.length).toBeGreaterThan(0);
  });
});
