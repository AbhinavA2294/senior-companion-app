"use client";

import { useState, useTransition } from "react";
import { runMatchingForBooking, logMatchAssignmentDecision } from "@/lib/actions/matching";
import { assignCompanionsToBooking } from "@/lib/actions/booking-assignments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Users,
} from "lucide-react";
import type { MatchResult, MatchCandidate, ScoreBreakdown, MatchWeights } from "@/lib/matching/types";

interface Props {
  bookingId: string;
  onAssigned?: () => void;
}

export function MatchingPanel({ bookingId, onAssigned }: Props) {
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignedId, setAssignedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRunMatching() {
    setError(null);
    startTransition(async () => {
      const res = await runMatchingForBooking(bookingId);
      if (res.success) {
        setResult(res.result);
      } else {
        setError(res.error);
      }
    });
  }

  async function handleAssign(candidate: MatchCandidate) {
    setAssigningId(candidate.companionProfileId);
    try {
      const assignRes = await assignCompanionsToBooking(bookingId, [candidate.companionProfileId]);
      if (assignRes.success) {
        await logMatchAssignmentDecision(bookingId, candidate.companionProfileId, true, candidate.rank);
        setAssignedId(candidate.companionProfileId);
        onAssigned?.();
      } else {
        setError(assignRes.error);
      }
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-gray-600">
            Score each approved companion against this booking using language,
            activity history, rating, experience, and availability.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Recommendations are advisory only. Final assignment requires admin approval.
          </p>
        </div>
        <Button
          onClick={handleRunMatching}
          disabled={isPending}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {isPending ? "Analysing…" : result ? "Re-run Matching" : "Find Best Companions"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <p>{error}</p>
        </Alert>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-sage-500" />
              {result.candidates.length} eligible
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-gray-400" />
              {result.excluded.length} excluded
            </span>
            <span>
              Generated {new Date(result.generatedAt).toLocaleTimeString()}
            </span>
          </div>

          {result.candidates.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">
              No eligible companions found for this booking. Check that companions have set
              their availability and are approved.
            </div>
          ) : (
            <ol className="space-y-2">
              {result.candidates.map((c) => (
                <CandidateRow
                  key={c.companionProfileId}
                  candidate={c}
                  weights={result.weightsUsed}
                  isExpanded={expandedId === c.companionProfileId}
                  onToggle={() =>
                    setExpandedId(
                      expandedId === c.companionProfileId ? null : c.companionProfileId,
                    )
                  }
                  onAssign={() => handleAssign(c)}
                  isAssigning={assigningId === c.companionProfileId}
                  isAssigned={assignedId === c.companionProfileId}
                />
              ))}
            </ol>
          )}

          {result.excluded.length > 0 && (
            <ExcludedList excluded={result.excluded} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Candidate Row ─────────────────────────────────────────────────────────────

function CandidateRow({
  candidate,
  weights,
  isExpanded,
  onToggle,
  onAssign,
  isAssigning,
  isAssigned,
}: {
  candidate: MatchCandidate;
  weights: MatchWeights;
  isExpanded: boolean;
  onToggle: () => void;
  onAssign: () => void;
  isAssigning: boolean;
  isAssigned: boolean;
}) {
  const scoreColor =
    candidate.totalScore >= 75
      ? "text-sage-700 bg-sage-50 border-sage-200"
      : candidate.totalScore >= 50
      ? "text-warm-700 bg-warm-50 border-warm-200"
      : "text-gray-600 bg-gray-50 border-gray-200";

  return (
    <li className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        {/* Rank badge */}
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 flex-shrink-0">
          {candidate.rank}
        </div>

        {/* Name + explanation */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{candidate.companionName}</p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {candidate.plainLanguageExplanation}
          </p>
        </div>

        {/* Score */}
        <div className={`rounded-lg border px-2.5 py-1 text-sm font-bold flex-shrink-0 ${scoreColor}`}>
          {candidate.totalScore}
        </div>

        {/* Assign */}
        {isAssigned ? (
          <Badge variant="success" className="flex-shrink-0">Assigned</Badge>
        ) : (
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); onAssign(); }}
            disabled={isAssigning}
            className="flex-shrink-0"
          >
            {isAssigning ? "Assigning…" : "Assign"}
          </Button>
        )}

        {/* Expand toggle */}
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-700 flex-shrink-0"
          aria-label={isExpanded ? "Hide breakdown" : "Show score breakdown"}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-50 bg-gray-50 px-4 py-3 space-y-3">
          <ScoreBreakdownGrid breakdown={candidate.scoreBreakdown} weights={weights} />
          {candidate.explanationFactors.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {candidate.explanationFactors.map((f) => (
                <span
                  key={f}
                  className="rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600"
                >
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// ── Score Breakdown Grid ──────────────────────────────────────────────────────

const FACTOR_LABELS: Array<{ key: keyof ScoreBreakdown; label: string }> = [
  { key: "language", label: "Language" },
  { key: "activity", label: "Activity match" },
  { key: "interests", label: "Interests" },
  { key: "rating", label: "Rating" },
  { key: "experience", label: "Experience" },
  { key: "repeatBooking", label: "Repeat booking" },
  { key: "distance", label: "Service radius" },
  { key: "cancellation", label: "Cancel history" },
];

function ScoreBreakdownGrid({
  breakdown,
  weights,
}: {
  breakdown: ScoreBreakdown;
  weights: MatchWeights;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2">Score breakdown</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {FACTOR_LABELS.map(({ key, label }) => {
          const raw = breakdown[key];
          const pct = Math.round(raw * 100);
          const barColor =
            pct >= 80 ? "bg-sage-400" : pct >= 50 ? "bg-warm-400" : "bg-gray-300";
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-xs font-medium text-gray-700">{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Excluded companions list ───────────────────────────────────────────────────

function ExcludedList({ excluded }: { excluded: MatchResult["excluded"] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <span>{excluded.length} companion{excluded.length !== 1 ? "s" : ""} excluded</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <ul className="divide-y divide-gray-50 border-t border-gray-100">
          {excluded.map((e) => (
            <li key={e.companionProfileId} className="px-4 py-2.5 flex items-start gap-3">
              <span className="text-sm font-medium text-gray-700 w-32 flex-shrink-0">
                {e.companionName}
              </span>
              <span className="text-xs text-gray-500">{e.reasons.join("; ")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
