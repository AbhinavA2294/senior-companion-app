// ── Deterministic Scoring Engine ─────────────────────────────────────────────
// Pure functions only — no DB access, no side effects.
// All inputs are pre-fetched by the server action before calling scoreCompanion.

import type {
  CompanionInput,
  BookingInput,
  SeniorInput,
  ScoreBreakdown,
  MatchWeights,
  MatchCandidate,
  MatchExcluded,
} from "./types";
import { MATCHING_CONFIG } from "./config";

// ── Hard-exclusion + scored result union ─────────────────────────────────────

export type ScoreResult =
  | { included: true; candidate: Omit<MatchCandidate, "rank" | "plainLanguageExplanation"> }
  | { included: false; excluded: MatchExcluded };

// ── Main entry point ─────────────────────────────────────────────────────────

export function scoreCompanion(
  companion: CompanionInput,
  booking: BookingInput,
  senior: SeniorInput,
  weights: MatchWeights,
  genderPreferenceEnabled: boolean = MATCHING_CONFIG.genderPreferenceEnabled,
): ScoreResult {
  const displayName = `${companion.firstName} ${companion.lastName.charAt(0)}.`;

  // ── Hard exclusions ────────────────────────────────────────────────────────
  const exclusionReasons: string[] = [];

  if (companion.verificationStatus === "suspended") {
    exclusionReasons.push("Companion is suspended");
  } else if (companion.verificationStatus !== "approved") {
    exclusionReasons.push("Companion is not approved");
  }
  if (!companion.availableForBooking) {
    exclusionReasons.push("Unavailable on this day / time");
  }
  if (companion.hasOverlappingBooking) {
    exclusionReasons.push("Already assigned to an overlapping booking");
  }
  if (companion.declinedThisBooking) {
    exclusionReasons.push("Has declined this booking");
  }

  if (exclusionReasons.length > 0) {
    return {
      included: false,
      excluded: {
        companionProfileId: companion.id,
        companionName: displayName,
        reasons: exclusionReasons,
      },
    };
  }

  // ── Factor scores (all 0-1) ────────────────────────────────────────────────
  const breakdown: ScoreBreakdown = {
    language: scoreLanguage(
      companion.languagesSpoken,
      senior.preferredLanguage,
      senior.additionalLanguages,
    ),
    activity: scoreActivity(
      companion.activityPreferences,
      companion.activitiesSupported,
      booking.activityTypeName,
    ),
    interests: scoreInterests(companion.interests, senior.interests),
    rating: scoreRating(companion.avgRating),
    experience: scoreExperience(companion.completedVisitsCount),
    repeatBooking: companion.completedVisitsWithSenior > 0 ? 1.0 : 0.0,
    distance: scoreDistance(companion.maxTravelMiles),
    genderPreference: genderPreferenceEnabled
      ? scoreGenderPreference(senior.preferredCompanionGender)
      : 1.0, // neutral — feature disabled or field not available
    cancellation: scoreCancellation(companion.recentDeclineCount),
  };

  // ── Build explanation factors ──────────────────────────────────────────────
  const factors: string[] = buildFactors(companion, senior, booking, breakdown);

  // ── Weighted total ─────────────────────────────────────────────────────────
  const totalScore = computeTotalScore(breakdown, weights, genderPreferenceEnabled);

  return {
    included: true,
    candidate: {
      companionProfileId: companion.id,
      companionName: displayName,
      totalScore,
      scoreBreakdown: breakdown,
      explanationFactors: factors,
    },
  };
}

// ── Factor scoring functions ──────────────────────────────────────────────────

export function scoreLanguage(
  spoken: string[],
  preferred: string,
  additional: string[],
): number {
  const norm = (s: string) => s.trim().toLowerCase();
  const spokenNorm = spoken.map(norm);
  if (spokenNorm.includes(norm(preferred))) return 1.0;
  const allSeniorLangs = [preferred, ...additional].map(norm);
  if (spokenNorm.some((l) => allSeniorLangs.includes(l))) return 0.5;
  return 0.0;
}

export function scoreActivity(
  preferences: string[],
  supported: string[],
  activityName: string,
): number {
  const norm = (s: string) => s.trim().toLowerCase();
  const nameLow = norm(activityName);
  const all = [...preferences, ...supported].map(norm);

  // Exact or substring match in either direction
  if (all.some((a) => a.includes(nameLow) || nameLow.includes(a))) return 1.0;

  // Keyword overlap (any word of 4+ chars matches)
  const keywords = nameLow.split(/\s+/).filter((w) => w.length >= 4);
  if (keywords.some((kw) => all.some((a) => a.includes(kw)))) return 0.5;

  return 0.0;
}

export function scoreInterests(
  companionInterests: string[],
  seniorInterests: string[],
): number {
  if (seniorInterests.length === 0 || companionInterests.length === 0) return 0.0;
  const norm = (s: string) => s.trim().toLowerCase();
  const ci = companionInterests.map(norm);
  const si = seniorInterests.map(norm);
  const overlap = ci.filter((i) => si.some((s) => s.includes(i) || i.includes(s)));
  return Math.min(1.0, overlap.length / Math.min(si.length, 3));
}

export function scoreRating(avgRating: number | null): number {
  // No ratings yet → neutral score (0.7 so new companions aren't penalised)
  if (avgRating === null) return 0.7;
  // Maps 1→0, 5→1 linearly
  return (avgRating - 1) / (MATCHING_CONFIG.maxRating - 1);
}

export function scoreExperience(completedCount: number): number {
  return Math.min(1.0, completedCount / MATCHING_CONFIG.experienceMaxVisits);
}

export function scoreDistance(maxTravelMiles: number): number {
  // Actual geocoordinates are not stored yet, so we use max_travel_miles as a
  // willingness-to-serve proxy. A companion with a larger service radius is
  // less likely to be geographically constrained.
  if (maxTravelMiles >= 25) return 1.0;
  if (maxTravelMiles >= 15) return 0.8;
  if (maxTravelMiles >= 10) return 0.6;
  if (maxTravelMiles >= 5) return 0.4;
  return 0.2;
}

export function scoreCancellation(recentDeclineCount: number): number {
  // Returns 1 for zero recent declines, decreasing with each decline
  if (recentDeclineCount === 0) return 1.0;
  if (recentDeclineCount === 1) return 0.7;
  if (recentDeclineCount === 2) return 0.4;
  return 0.1;
}

// Gender preference: requires a companion `gender` field which is not yet in
// the schema. This function returns neutral (1.0) until the field is added
// and the feature is legally reviewed.
export function scoreGenderPreference(
  _pref: SeniorInput["preferredCompanionGender"],
): number {
  return 1.0;
}

// ── Weighted total score ──────────────────────────────────────────────────────

export function computeTotalScore(
  b: ScoreBreakdown,
  w: MatchWeights,
  genderEnabled: boolean,
): number {
  const positiveWeights =
    w.language + w.activity + w.interests + w.rating + w.experience +
    w.repeatBooking + w.distance + (genderEnabled ? w.genderPreference : 0);

  if (positiveWeights === 0) return 0;

  const weighted =
    b.language * w.language +
    b.activity * w.activity +
    b.interests * w.interests +
    b.rating * w.rating +
    b.experience * w.experience +
    b.repeatBooking * w.repeatBooking +
    b.distance * w.distance +
    (genderEnabled ? b.genderPreference * w.genderPreference : 0);

  const cancellationDeduction = (1 - b.cancellation) * w.cancellationPenalty;

  return Math.max(0, Math.min(100, Math.round(
    ((weighted - cancellationDeduction) / positiveWeights) * 100,
  )));
}

// ── Human-readable explanation factors ───────────────────────────────────────
// Labels describe the companion only — no senior PII included.

function buildFactors(
  companion: CompanionInput,
  senior: SeniorInput,
  booking: BookingInput,
  b: ScoreBreakdown,
): string[] {
  const factors: string[] = [];

  if (b.language === 1.0) {
    factors.push(`speaks ${senior.preferredLanguage}`);
  } else if (b.language === 0.5) {
    factors.push("speaks a language the senior knows");
  }

  if (b.activity === 1.0) {
    factors.push(`experienced with ${booking.activityTypeName}`);
  } else if (b.activity === 0.5) {
    factors.push("has some relevant activity experience");
  }

  if (b.interests > 0.5) {
    factors.push("shared interests with the senior");
  }

  if (companion.avgRating !== null) {
    if (b.rating >= 0.9) {
      factors.push(`${companion.avgRating.toFixed(1)}-star rating`);
    } else if (b.rating >= 0.7) {
      factors.push("strong rating");
    }
  }

  if (b.repeatBooking === 1.0) {
    factors.push("has successfully supported this senior before");
  }

  if (companion.completedVisitsCount >= 10) {
    factors.push(`${companion.completedVisitsCount} completed visits`);
  } else if (companion.completedVisitsCount > 0) {
    factors.push(`${companion.completedVisitsCount} completed visit${companion.completedVisitsCount > 1 ? "s" : ""}`);
  }

  if (companion.maxTravelMiles >= 15) {
    factors.push(`serves up to ${companion.maxTravelMiles}-mile radius`);
  }

  if (b.cancellation < 0.6) {
    factors.push("some recent declines noted");
  }

  return factors.length > 0 ? factors : ["available companion"];
}
