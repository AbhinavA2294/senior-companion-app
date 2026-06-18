import type { LLMExplainerAdapter } from "./types";
import type { ExplainerInput } from "../types";

// ── Mock LLM Explainer ────────────────────────────────────────────────────────
// Builds a plain-language sentence from the factor labels deterministically —
// no external API call is made. Use this in development and as the default
// until a real LLM adapter is wired in.
//
// Input contract: ExplainerInput contains NO senior PII. If a real provider is
// substituted, it must honour the same input contract. Never add senior name,
// senior ID, health info, or booking ID to ExplainerInput.

export class MockLLMExplainer implements LLMExplainerAdapter {
  async generateExplanation(input: ExplainerInput): Promise<string> {
    const { companionFirstName, activityTypeName, rank, factors } = input;

    if (factors.length === 0 || (factors.length === 1 && factors[0] === "available companion")) {
      return `${companionFirstName} is an available companion for this ${activityTypeName} visit.`;
    }

    const displayFactors = factors.filter((f) => f !== "some recent declines noted");
    const cautionNote = factors.includes("some recent declines noted")
      ? " Note: some recent declines on record."
      : "";

    let factorText: string;
    if (displayFactors.length === 1) {
      factorText = displayFactors[0];
    } else {
      const init = displayFactors.slice(0, -1).join(", ");
      factorText = `${init}, and ${displayFactors[displayFactors.length - 1]}`;
    }

    const opener =
      rank === 1
        ? "Top recommendation"
        : rank === 2
        ? "Strong match"
        : `Ranked #${rank}`;

    return `${opener}: ${companionFirstName} is recommended because they ${factorText}.${cautionNote}`;
  }
}
