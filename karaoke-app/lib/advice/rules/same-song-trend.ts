/**
 * R22: 同曲 改善トレンド 診断
 *
 * Source: empirical
 * Confidence: medium
 *
 * `focusSongId` 指定時のみ稼働。同曲の歌唱を時系列で並べ、直近 5 回の平均と
 * それ以前 5 回の平均の差を見る。+TREND_DELTA_MIN 以上なら改善傾向 info、
 * -TREND_DELTA_MIN 以下なら悪化 tip。
 */

import { TREND_DELTA_MIN } from "../thresholds";
import type { Finding, ScoreHistoryInput } from "../types";

const WINDOW = 5;

export function evaluateSameSongTrend(
  input: ScoreHistoryInput,
): Finding[] {
  if (!input.focusSongId) return [];
  const songScores = input.scores
    .filter((s) => s.song_id === input.focusSongId)
    .sort((a, b) => a.sung_at.localeCompare(b.sung_at)); // oldest first

  // Need at least 2 full windows.
  if (songScores.length < WINDOW * 2) return [];

  const recent = songScores.slice(-WINDOW);
  const prior = songScores.slice(-WINDOW * 2, -WINDOW);
  const recentMean =
    recent.reduce((s, r) => s + r.total_score, 0) / recent.length;
  const priorMean =
    prior.reduce((s, r) => s + r.total_score, 0) / prior.length;
  const delta = recentMean - priorMean;

  if (Math.abs(delta) < TREND_DELTA_MIN) return [];

  if (delta > 0) {
    return [
      {
        ruleId: "R22.improving",
        severity: "info",
        title: "同曲で改善トレンド中",
        message:
          `この曲の直近 ${WINDOW} 回平均は ${recentMean.toFixed(2)}、それ以前 ${WINDOW} 回平均は ${priorMean.toFixed(2)}。+${delta.toFixed(2)} 点の成長が出ています。`,
        metrics: {
          recent_mean: round2(recentMean),
          prior_mean: round2(priorMean),
          delta: round2(delta),
        },
        source: "empirical",
        confidence: "medium",
      },
    ];
  }

  return [
    {
      ruleId: "R22.declining",
      severity: "tip",
      title: "同曲でスコア低下中",
      message:
        `この曲の直近 ${WINDOW} 回平均は ${recentMean.toFixed(2)}、それ以前 ${WINDOW} 回平均は ${priorMean.toFixed(2)} (${delta.toFixed(2)} 点)。疲労・キー設定・歌い癖の変化を確認してください。`,
      metrics: {
        recent_mean: round2(recentMean),
        prior_mean: round2(priorMean),
        delta: round2(delta),
      },
      source: "empirical",
      confidence: "medium",
    },
  ];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
