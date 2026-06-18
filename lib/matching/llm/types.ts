import type { ExplainerInput } from "../types";

// ── LLM Adapter Interface ─────────────────────────────────────────────────────
// Implementors generate a plain-language explanation from the deterministic
// score breakdown. The input is intentionally stripped of all sensitive senior
// PII — only activity type, companion first name, rank, and factor labels.

export interface LLMExplainerAdapter {
  generateExplanation(input: ExplainerInput): Promise<string>;
}
