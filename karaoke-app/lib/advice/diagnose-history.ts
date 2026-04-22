/**
 * Aggregate diagnostic orchestrator (S3).
 *
 * Two entry points:
 *   diagnoseHistoryForSong  — song-focused (R20, R22). Use on the repertoire
 *                             detail page. Needs `focusSongId`.
 *   diagnoseHistoryOverall  — cross-song aggregate (R21, R23, R24). Use on
 *                             the /stats page. Ignores focusSongId.
 *
 * Splitting the two means the repertoire detail page no longer shows advice
 * about *other* songs (e.g. 得意曲 vs 苦手曲), which felt out of place.
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

const SONG_SCOPED_RULES: AggregateRuleFn[] = [
  evaluateKeyRecommendationAdvice, // R20 (focusSongId required)
  evaluateSameSongTrend, // R22 (focusSongId required)
];

const OVERALL_RULES: AggregateRuleFn[] = [
  evaluateStagnantAxis, // R21 (all-history)
  evaluateBaseBonusCorrelation, // R23 (all-history)
  evaluateSongGap, // R24 (all-history)
];

/** Run song-scoped aggregate rules. Returns [] if focusSongId is missing. */
export function diagnoseHistoryForSong(
  input: ScoreHistoryInput,
): Finding[] {
  if (!input.focusSongId) return [];
  const out: Finding[] = [];
  for (const rule of SONG_SCOPED_RULES) out.push(...rule(input));
  return out;
}

/** Run cross-song aggregate rules. focusSongId is ignored. */
export function diagnoseHistoryOverall(
  input: ScoreHistoryInput,
): Finding[] {
  const out: Finding[] = [];
  for (const rule of OVERALL_RULES) out.push(...rule(input));
  return out;
}

/**
 * @deprecated Prefer `diagnoseHistoryForSong` / `diagnoseHistoryOverall`.
 * Kept for backwards compatibility with existing callers; returns all
 * applicable findings (both scopes).
 */
export function diagnoseHistory(input: ScoreHistoryInput): Finding[] {
  return [
    ...diagnoseHistoryForSong(input),
    ...diagnoseHistoryOverall(input),
  ];
}
