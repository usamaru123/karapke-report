/**
 * R23: 素点 × ボーナス 逆相関 診断
 *
 * Source: empirical (ナレッジ: 素点が高いほど Ai 感性ボーナスが小さい)
 * Confidence: medium
 *
 * 全 Ai スコアで「素点 = total - ai_bonus」と ai_bonus の Pearson 相関を
 * 計算する。強い負相関 (<= -0.3) が観測されれば「現フェーズではボーナスで
 * 稼ぐより素点を上げる方が効率的」と提示。逆相関は理論的には期待される
 * が、ユーザーごとに強度は変わるので個別にフィット。
 */

import {
  AGGREGATE_MIN_SCORES,
  BONUS_CORRELATION_NEGATIVE_MAX,
} from "../thresholds";
import type { Finding, ScoreHistoryInput } from "../types";

export function evaluateBaseBonusCorrelation(
  input: ScoreHistoryInput,
): Finding[] {
  const samples = input.scores
    .filter((s) => s.scoring_type === "ai" && s.ai_bonus !== null)
    .map((s) => ({
      base: s.total_score - (s.ai_bonus ?? 0),
      bonus: s.ai_bonus ?? 0,
    }));

  if (samples.length < Math.max(AGGREGATE_MIN_SCORES, 5)) return [];

  const r = pearson(
    samples.map((s) => s.base),
    samples.map((s) => s.bonus),
  );
  if (!Number.isFinite(r)) return [];
  if (r > BONUS_CORRELATION_NEGATIVE_MAX) return [];

  return [
    {
      ruleId: "R23.negative_correlation",
      severity: "tip",
      title: "ボーナスは素点を上げると縮む傾向",
      message:
        `素点 (total − ai_bonus) と Ai 感性ボーナスの相関係数は ${r.toFixed(2)}。自分の履歴でも「素点が高い歌唱ほどボーナスが小さい」傾向が強く見られます。` +
        " 現在は素点を底上げする方向にフォーカスすると総合点が伸びやすいです (ナレッジ王道 = 素点 94 + ボーナス 4)。",
      metrics: {
        correlation: round2(r),
        sample_count: samples.length,
      },
      source: "empirical",
      confidence: "medium",
    },
  ];
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n !== ys.length || n === 0) return Number.NaN;
  const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? Number.NaN : num / denom;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
