import type { MatchWeights } from "./types";

// ── Default factor weights ─────────────────────────────────────────────────────
// These are the "out-of-the-box" weights. Operators can override via env vars
// or the admin config UI (future). Units are arbitrary — only relative magnitude
// matters because the engine normalises to a 0-100 score.
export const DEFAULT_WEIGHTS: MatchWeights = {
  language: 20,
  activity: 15,
  interests: 10,
  rating: 20,
  experience: 10,
  repeatBooking: 15,
  distance: 5,
  genderPreference: 5,   // only applied when GENDER_PREFERENCE_MATCHING=true
  cancellationPenalty: 10, // subtracted from weighted sum
};

// ── Feature flags ─────────────────────────────────────────────────────────────
export const MATCHING_CONFIG = {
  // Master switch — set MATCHING_ENABLED=false to hide matching UI entirely
  enabled: process.env.MATCHING_ENABLED !== "false",

  // Gender-preference matching: OFF by default.
  // Requires legal review and a companion `gender` field before enabling.
  genderPreferenceEnabled: process.env.GENDER_PREFERENCE_MATCHING === "true",

  // Maximum ranked candidates returned to the admin
  maxCandidates: 10,

  // Completed visits needed to reach the full experience score
  experienceMaxVisits: 50,

  // Maximum star rating (used for normalisation)
  maxRating: 5,

  // How many days back to look for recent decline history
  declineWindowDays: 90,
} as const;

// ── Weight overrides from environment ────────────────────────────────────────
// Any MATCH_WEIGHT_<FACTOR> env var (integer) overrides the default.
// e.g. MATCH_WEIGHT_LANGUAGE=30
function envWeight(key: keyof MatchWeights, fallback: number): number {
  const envKey = `MATCH_WEIGHT_${key.toUpperCase()}`;
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function resolveWeights(overrides?: Partial<MatchWeights>): MatchWeights {
  const base = DEFAULT_WEIGHTS;
  return {
    language: envWeight("language", overrides?.language ?? base.language),
    activity: envWeight("activity", overrides?.activity ?? base.activity),
    interests: envWeight("interests", overrides?.interests ?? base.interests),
    rating: envWeight("rating", overrides?.rating ?? base.rating),
    experience: envWeight("experience", overrides?.experience ?? base.experience),
    repeatBooking: envWeight("repeatBooking", overrides?.repeatBooking ?? base.repeatBooking),
    distance: envWeight("distance", overrides?.distance ?? base.distance),
    genderPreference: envWeight("genderPreference", overrides?.genderPreference ?? base.genderPreference),
    cancellationPenalty: envWeight("cancellationPenalty", overrides?.cancellationPenalty ?? base.cancellationPenalty),
  };
}
