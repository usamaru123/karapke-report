/**
 * Shared types for the advice engine.
 *
 * Every rule returns Finding[]. An empty array means "no advice for this
 * input" (not an error). Callers aggregate, sort by severity, and render.
 */

import type { ScoringType } from "@/types/domain";

/** Single-score input passed to per-score rules (R01-R11, R14). */
export type ScoreInput = {
  /** Opaque id — only used for downstream linking. Not consumed by rules. */
  id: string;
  scoring_type: ScoringType;
  total_score: number;
  pitch_score: number | null;
  stability_score: number | null;
  expression_score: number | null;
  vibrato_longtone_score: number | null;
  rhythm_score: number | null;
  ai_bonus: number | null;
  intonation: number | null;
  key_control: number;
  singing_range_lowest: number | null;
  singing_range_highest: number | null;
  /** Song's reference range (for R09). */
  song_range_lowest: number | null;
  song_range_highest: number | null;
  /** User's aggregate observed range (for R09). Same shape as UserVocalRange. */
  user_range_low: number | null;
  user_range_high: number | null;
  /**
   * The raw DAM XML-as-JSON blob for rules that need fields beyond the
   * promoted columns (R05 vibrato meta, R07 technique counts, R11 Ai deduct
   * graph, R12 national average, R14 melody section flags). Null for records
   * synced before detailFlg=1 was enabled, in which case the dependent rules
   * no-op silently.
   */
  raw_xml: unknown | null;
};

export type Severity = "info" | "tip" | "warn";
export type SourceLabel = "official" | "empirical" | "inferred";
export type Confidence = "low" | "medium" | "high";

export type Finding = {
  /** Stable identifier for UI keys / analytics. e.g. "R01.bonus_diminishing". */
  ruleId: string;
  severity: Severity;
  title: string;
  message: string;
  /** Numeric evidence shown in the expandable panel. Keep values finite. */
  metrics: Record<string, number>;
  source: SourceLabel;
  confidence: Confidence;
};

/** Helper: produce a finding with defaults. */
export function makeFinding(partial: {
  ruleId: string;
  severity: Severity;
  title: string;
  message: string;
  metrics?: Record<string, number>;
  source: SourceLabel;
  confidence: Confidence;
}): Finding {
  return {
    metrics: {},
    ...partial,
  };
}
