/**
 * Single-score diagnostic orchestrator.
 *
 * Runs every per-score rule in deterministic order and returns the flat
 * Finding[] for a given ScoreInput. Callers (typically the repertoire
 * detail Server Component) then sort / cap / render.
 *
 * Adding a new rule: import its evaluator here and append to `RULES`.
 * Never put rule logic inline — each rule stays in its own file for unit
 * testability.
 */

import { evaluateAiDeductSegment } from "./rules/ai-deduct-segment";
import { evaluateHeartRouletteNote } from "./rules/heart-roulette-note";
import { evaluateIntonationCeiling } from "./rules/intonation-ceiling";
import { evaluateKeyFitness } from "./rules/key-fitness";
import { evaluateMelodySection } from "./rules/melody-section";
import { evaluateNationalAverage } from "./rules/national-average";
import { evaluatePitchSweetSpot } from "./rules/pitch-sweet-spot";
import { evaluateRadarWeakestAxis } from "./rules/radar-weakest-axis";
import { evaluateRhythmTiming } from "./rules/rhythm-timing";
import { evaluateScoreBonusSplit } from "./rules/score-bonus-split";
import { evaluateTechniqueVariety } from "./rules/technique-variety";
import { evaluateVibratoType } from "./rules/vibrato-type";
import type { Finding, ScoreInput, Severity } from "./types";

type RuleFn = (score: ScoreInput) => Finding[];

const RULES: RuleFn[] = [
  evaluateScoreBonusSplit, // R01
  evaluateIntonationCeiling, // R02
  evaluatePitchSweetSpot, // R03
  evaluateRadarWeakestAxis, // R04
  evaluateVibratoType, // R05
  evaluateRhythmTiming, // R06
  evaluateTechniqueVariety, // R07
  evaluateKeyFitness, // R09
  evaluateHeartRouletteNote, // R10
  evaluateAiDeductSegment, // R11
  evaluateNationalAverage, // R12
  evaluateMelodySection, // R14
];

/** Run every rule and concat their outputs. */
export function diagnoseScore(score: ScoreInput): Finding[] {
  const out: Finding[] = [];
  for (const rule of RULES) {
    out.push(...rule(score));
  }
  return out;
}

// Severity sort order: warn > tip > info. Used when rendering a capped list.
const SEVERITY_RANK: Record<Severity, number> = {
  warn: 0,
  tip: 1,
  info: 2,
};

/**
 * Sort by severity (warn first), then by confidence (high first), then by
 * ruleId for stability. Returns a new array — does not mutate.
 */
export function sortFindings(findings: Finding[]): Finding[] {
  const CONFIDENCE_RANK = { high: 0, medium: 1, low: 2 } as const;
  return [...findings].sort((a, b) => {
    const severityDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (severityDiff !== 0) return severityDiff;
    const confDiff = CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence];
    if (confDiff !== 0) return confDiff;
    return a.ruleId.localeCompare(b.ruleId);
  });
}
