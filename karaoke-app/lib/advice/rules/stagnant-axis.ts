/**
 * R21: 伸び悩み項目 診断
 *
 * Source: empirical
 * Confidence: medium
 *
 * 直近 N 回 (STAGNANT_RECENT_N) の歌唱でレーダー軸平均を出し、最弱軸と
 * 次点との差が STAGNANT_AXIS_LOCK_GAP 以上なら「構造的ボトルネック」と
 * 判断して警告する。全履歴スコープ。
 */

import {
  AGGREGATE_MIN_SCORES,
  STAGNANT_AXIS_LOCK_GAP,
  STAGNANT_RECENT_N,
} from "../thresholds";
import type { Finding, ScoreHistoryInput } from "../types";

type AxisKey =
  | "pitch_score"
  | "stability_score"
  | "expression_score"
  | "vibrato_longtone_score"
  | "rhythm_score";

const AXIS_LABEL: Record<AxisKey, string> = {
  pitch_score: "音程",
  stability_score: "安定性",
  expression_score: "表現力",
  vibrato_longtone_score: "ビブラート&ロングトーン",
  rhythm_score: "リズム",
};

const AXIS_KEYS: AxisKey[] = [
  "pitch_score",
  "stability_score",
  "expression_score",
  "vibrato_longtone_score",
  "rhythm_score",
];

export function evaluateStagnantAxis(
  input: ScoreHistoryInput,
): Finding[] {
  if (input.scores.length < AGGREGATE_MIN_SCORES) return [];

  const recent = [...input.scores]
    .sort((a, b) => b.sung_at.localeCompare(a.sung_at))
    .slice(0, STAGNANT_RECENT_N);
  if (recent.length < AGGREGATE_MIN_SCORES) return [];

  const means = new Map<AxisKey, number>();
  for (const k of AXIS_KEYS) {
    const vals = recent
      .map((s) => s[k])
      .filter((v): v is number => v !== null);
    if (vals.length === 0) continue;
    means.set(k, vals.reduce((s, n) => s + n, 0) / vals.length);
  }
  if (means.size < 3) return [];

  const sorted = [...means.entries()].sort((a, b) => a[1] - b[1]);
  const [weakestKey, weakestVal] = sorted[0];
  const [secondKey, secondVal] = sorted[1];
  const gap = secondVal - weakestVal;
  if (gap < STAGNANT_AXIS_LOCK_GAP) return [];

  return [
    {
      ruleId: "R21.stagnant",
      severity: "warn",
      title: `${AXIS_LABEL[weakestKey]} が伸び悩んでいます`,
      message:
        `直近 ${recent.length} 回の平均で ${AXIS_LABEL[weakestKey]} が ${weakestVal.toFixed(1)}、次点 (${AXIS_LABEL[secondKey]}) との差は ${gap.toFixed(1)} 点。` +
        " この軸は継続的なボトルネックです。今後 1-2 回はこの軸への集中練習をおすすめします。",
      metrics: {
        weakest_mean: round1(weakestVal),
        second_mean: round1(secondVal),
        gap: round1(gap),
        recent_count: recent.length,
      },
      source: "empirical",
      confidence: "medium",
    },
  ];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
