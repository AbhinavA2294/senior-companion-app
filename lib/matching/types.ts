// ── Matching Engine Types ─────────────────────────────────────────────────────
// All types are designed so that no sensitive senior PII flows into the LLM
// adapter or into the plain-language explanation.

export interface MatchWeights {
  language: number;
  activity: number;
  interests: number;
  rating: number;
  experience: number;
  repeatBooking: number;
  distance: number;
  genderPreference: number;
  cancellationPenalty: number; // subtracted, not added
}

export interface ScoreBreakdown {
  language: number;         // 0-1: senior's preferred language spoken
  activity: number;         // 0-1: experience with this activity type
  interests: number;        // 0-1: shared interests overlap
  rating: number;           // 0-1: normalised from avg rating (1–5 scale)
  experience: number;       // 0-1: completed visits (capped at config max)
  repeatBooking: number;    // 0 or 1: has prior completed visit with this senior
  distance: number;         // 0-1: willingness-to-travel proxy (no geocoords yet)
  genderPreference: number; // 0 or 1, neutral when feature disabled
  cancellation: number;     // 0-1: 1 = clean history, decreases with recent declines
}

// Input to the pure scoring function — all pre-fetched from DB by the action
export interface CompanionInput {
  id: string;                   // companion_profile_id
  profileId: string;            // profiles.id (for ratings join)
  firstName: string;
  lastName: string;
  verificationStatus: string;
  maxTravelMiles: number;
  languagesSpoken: string[];
  activityPreferences: string[];
  activitiesSupported: string[];
  interests: string[];

  // Pre-computed availability / history (computed by the server action)
  availableForBooking: boolean;
  hasOverlappingBooking: boolean;
  declinedThisBooking: boolean;
  avgRating: number | null;
  completedVisitsCount: number;
  completedVisitsWithSenior: number;
  recentDeclineCount: number;   // declined assignments in last 90 days
}

// Booking context fed into scoring — no PII
export interface BookingInput {
  id: string;
  activityTypeName: string;
  scheduledDate: string;      // YYYY-MM-DD
  scheduledStartTime: string; // HH:MM
  durationHours: number;
  seniorProfileId: string;
}

// Senior preferences — only non-identifying attributes
export interface SeniorInput {
  preferredLanguage: string;
  additionalLanguages: string[];
  interests: string[];
  preferredCompanionGender: "male" | "female" | "no_preference" | null;
}

export interface MatchCandidate {
  companionProfileId: string;
  companionName: string; // "First L." — no full surname in LLM input
  totalScore: number;    // 0–100
  scoreBreakdown: ScoreBreakdown;
  explanationFactors: string[]; // labels, no PII
  plainLanguageExplanation: string;
  rank: number;
}

export interface MatchExcluded {
  companionProfileId: string;
  companionName: string;
  reasons: string[];
}

export interface MatchResult {
  bookingId: string;
  candidates: MatchCandidate[];
  excluded: MatchExcluded[];
  weightsUsed: MatchWeights;
  generatedAt: string;
}

// ── LLM adapter input ─────────────────────────────────────────────────────────
// Only non-identifying data: companion first name, activity label, rank, factors.
// No senior name, senior ID, booking ID, or any personal health/preference data.
export interface ExplainerInput {
  companionFirstName: string;
  activityTypeName: string;
  rank: number;
  factors: string[];
}
