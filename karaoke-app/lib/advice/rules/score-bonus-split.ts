/**
 * R01: 素点/ボーナス分解診断
 *
 * Source: empirical (∀ε氏 / からおけまりも氏 実測ログ集約)
 * Confidence: medium
 *
 * ナレッジ: "Ai 感性ボーナスは素点が高いほど小さくなる逆相関構造。素点 94 +
 * ボーナス 4 が王道。素点 95 超はボーナス減衰ゾーン。素点 80 台で +6 点近く
 * 加算される場合はボーナス過依存。"
 *
 * Ai Heart は ai_bonus の意味が未確定のため適用外（scoring_type='ai' 限定）。
 */

import {
  BASE_SCORE_BONUS_DIMINISHING,
  BASE_SCORE_BONUS_OVERDEPENDENT_LOW,
  BONUS_OVERDEPENDENT_HIGH,
} from "../thresholds";
import type { Finding, ScoreInput } from "../types";

export function evaluateScoreBonusSplit(score: ScoreInput): Finding[] {
  // Scope: Ai only. Heart's bonus semantics are unverified (docs §3 Q2).
  if (score.scoring_type !== "ai") return [];
  if (score.ai_bonus === null) return [];

  const base = score.total_score - score.ai_bonus;
  const findings: Finding[] = [];

  // Case A: 素点 >= 95 → bonus is hitting the diminishing-returns ceiling.
  if (base >= BASE_SCORE_BONUS_DIMINISHING) {
    findings.push({
      ruleId: "R01.bonus_diminishing",
      severity: "warn",
      title: "ボーナス減衰ゾーンです",
      message:
        `素点 ${base.toFixed(1)} が 95 を超えています。Ai 感性ボーナスは素点が高いほど小さくなるため、` +
        `この先は素点 1 点の上昇よりもボーナス側の稼ぎ方（抑揚・技法の多様性）の方が効きます。`,
      metrics: { base_score: round1(base), ai_bonus: round1(score.ai_bonus) },
      source: "empirical",
      confidence: "medium",
    });
    return findings;
  }

  // Case B: 素点 < 85 かつ ボーナス > 5 → 過依存。
  if (
    base < BASE_SCORE_BONUS_OVERDEPENDENT_LOW &&
    score.ai_bonus > BONUS_OVERDEPENDENT_HIGH
  ) {
    findings.push({
      ruleId: "R01.bonus_overdependent",
      severity: "tip",
      title: "ボーナス依存度が高い",
      message:
        `素点 ${base.toFixed(1)} にボーナス ${score.ai_bonus.toFixed(1)} が乗っています。` +
        `ボーナスは素点 85+ からは伸びづらくなる傾向です。素点 (音程・安定性) の底上げに投資すると次の壁を越えやすくなります。`,
      metrics: { base_score: round1(base), ai_bonus: round1(score.ai_bonus) },
      source: "empirical",
      confidence: "medium",
    });
    return findings;
  }

  // Case C: 85 <= 素点 < 95 — ideal zone, emit an info for positive reinforcement.
  findings.push({
    ruleId: "R01.balanced",
    severity: "info",
    title: "素点とボーナスのバランス良好",
    message:
      `素点 ${base.toFixed(1)} + ボーナス ${score.ai_bonus.toFixed(1)} = ${score.total_score.toFixed(1)}。` +
      `ナレッジの「素点 94 + ボーナス 4」という高得点帯に近い配分です。`,
    metrics: { base_score: round1(base), ai_bonus: round1(score.ai_bonus) },
    source: "empirical",
    confidence: "medium",
  });

  return findings;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
