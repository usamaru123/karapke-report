/**
 * Aggregate diagnostic orchestrator (S3).
 *
 * Aggregate rules operate on the user's full scored history instead of a
 * single row. Some rules (R20, R22) only fire when the caller passes a
 * `focusSongId` — that's the case on the repertoire detail page where
 * same-song analysis is meaningful.
 *
 * Single-score rules (R01-R14) live in `diagnose-score.ts`.
 */

import { evaluateBaseBonusCorrelation } from "./rules/base-bonus-correlation";
import { evaluateKeyRecommendationAdvice } from "./rules/key-recommendation-advice";
import { evaluateSameSongTrend } from "./rules/same-song-trend";
import { evaluateSongGap } from "./rules/song-gap";
import { evaluateStagnantAxis } from "./rules/stagnant-axis";
import type { Finding, ScoreHistoryInput } from "./types";

type AggregateRuleFn = (input: ScoreHistoryInput) => Finding[];

const RULES: AggregateRuleFn[] = [
  evaluateKeyRecommendationAdvice, // R20 (focusSongId required)
  evaluateStagnantAxis, // R21 (all-history)
  evaluateSameSongTrend, // R22 (focusSongId required)
  evaluateBaseBonusCorrelation, // R23 (all-history)
  evaluateSongGap, // R24 (all-history)
];

export function diagnoseHistory(input: ScoreHistoryInput): Finding[] {
  const out: Finding[] = [];
  for (const rule of RULES) {
    out.push(...rule(input));
  }
  return out;
}
