// ── Matching Engine Orchestrator ──────────────────────────────────────────────
// Combines the deterministic scorer with the LLM explainer.
// DB access happens in lib/actions/matching.ts — this layer is pure.

import { scoreCompanion } from "./scoring";
import { MockLLMExplainer } from "./llm/mock-provider";
import { resolveWeights } from "./config";
import type {
  CompanionInput,
  BookingInput,
  SeniorInput,
  MatchResult,
  MatchWeights,
} from "./types";
import type { LLMExplainerAdapter } from "./llm/types";

const defaultExplainer = new MockLLMExplainer();

export async function runMatching(
  companions: CompanionInput[],
  booking: BookingInput,
  senior: SeniorInput,
  options?: {
    weightOverrides?: Partial<MatchWeights>;
    genderPreferenceEnabled?: boolean;
    explainer?: LLMExplainerAdapter;
    maxCandidates?: number;
  },
): Promise<MatchResult> {
  const weights = resolveWeights(options?.weightOverrides);
  const genderEnabled = options?.genderPreferenceEnabled ?? false;
  const explainer = options?.explainer ?? defaultExplainer;
  const maxCandidates = options?.maxCandidates ?? 10;

  const scoredList: Array<{ score: number; idx: number }> = [];
  const excludedResults: MatchResult["excluded"] = [];

  // Score all companions
  const rawResults = companions.map((c) =>
    scoreCompanion(c, booking, senior, weights, genderEnabled),
  );

  rawResults.forEach((result) => {
    if (result.included) {
      scoredList.push({ score: result.candidate.totalScore, idx: scoredList.length });
    } else {
      excludedResults.push(result.excluded);
    }
  });

  // Sort by score descending, stable sort on name as tiebreaker
  const includedCandidates = rawResults
    .filter((r): r is Extract<typeof r, { included: true }> => r.included)
    .sort((a, b) => {
      const diff = b.candidate.totalScore - a.candidate.totalScore;
      if (diff !== 0) return diff;
      return a.candidate.companionName.localeCompare(b.candidate.companionName);
    })
    .slice(0, maxCandidates);

  // Generate plain-language explanations (non-blocking: failures use fallback)
  const candidates: MatchResult["candidates"] = await Promise.all(
    includedCandidates.map(async (r, i) => {
      let explanation: string;
      try {
        // ExplainerInput deliberately excludes senior PII
        explanation = await explainer.generateExplanation({
          companionFirstName: r.candidate.companionName.split(" ")[0],
          activityTypeName: booking.activityTypeName,
          rank: i + 1,
          factors: r.candidate.explanationFactors,
        });
      } catch {
        explanation = `Ranked #${i + 1} companion for this visit.`;
      }
      return {
        ...r.candidate,
        plainLanguageExplanation: explanation,
        rank: i + 1,
      };
    }),
  );

  return {
    bookingId: booking.id,
    candidates,
    excluded: excludedResults,
    weightsUsed: weights,
    generatedAt: new Date().toISOString(),
  };
}

export { scoreCompanion } from "./scoring";
export { resolveWeights } from "./config";
export { MATCHING_CONFIG } from "./config";
export type * from "./types";
