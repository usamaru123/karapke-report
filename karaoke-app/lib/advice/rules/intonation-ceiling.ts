/**
 * R02: 抑揚 → 表現力上限 診断
 *
 * Source: inferred (こじがみさま氏 実測フィッティング、intonation ≥ 80 で成立)
 * Confidence: medium
 *
 * 式: y = 0.25 * intonation + 78 (抑揚 80 以上で表現力の近似上限)
 *
 * 現在の expression_score が計算上限に張り付いているなら、「抑揚を上げれば
 * 表現力も自動で上がる余地がある」というアドバイス。intonation < 80 では
 * 式の妥当性が乏しいため適用しない。
 */

import {
  INTONATION_CEILING_STICK_EPSILON,
  INTONATION_FORMULA_INTERCEPT,
  INTONATION_FORMULA_SLOPE,
  INTONATION_FORMULA_VALID_AT,
} from "../thresholds";
import type { Finding, ScoreInput } from "../types";

/** Compute the predicted expression ceiling for a given intonation (80+). */
export function predictedExpressionCeiling(intonation: number): number {
  return INTONATION_FORMULA_SLOPE * intonation + INTONATION_FORMULA_INTERCEPT;
}

export function evaluateIntonationCeiling(score: ScoreInput): Finding[] {
  if (score.intonation === null) return [];
  if (score.expression_score === null) return [];
  // The formula is only valid for intonation ≥ 80 per こじがみさま.
  if (score.intonation < INTONATION_FORMULA_VALID_AT) return [];

  const ceiling = predictedExpressionCeiling(score.intonation);
  const gap = ceiling - score.expression_score;

  // Gap within epsilon → expression is stuck at the intonation-imposed ceiling.
  if (Math.abs(gap) <= INTONATION_CEILING_STICK_EPSILON) {
    const nextCeiling = predictedExpressionCeiling(score.intonation + 5);
    return [
      {
        ruleId: "R02.ceiling_stuck",
        severity: "tip",
        title: "表現力の天井は抑揚で決まっています",
        message:
          `抑揚 ${score.intonation} の推定上限 ${ceiling.toFixed(1)} に対し、表現力は ${score.expression_score} 。` +
          `抑揚を +5 上げると表現力上限は ${nextCeiling.toFixed(1)} まで解放されます (推定式)。` +
          `強弱比 1:2 を意識した歌い方が効きます。`,
        metrics: {
          intonation: score.intonation,
          expression: score.expression_score,
          predicted_ceiling: round1(ceiling),
          next_ceiling_at_plus5: round1(nextCeiling),
        },
        source: "inferred",
        confidence: "medium",
      },
    ];
  }

  // Expression is below the ceiling — expression itself has room independent
  // of intonation. No R02 finding; other rules (R04 radar weakest) will cover.
  return [];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
