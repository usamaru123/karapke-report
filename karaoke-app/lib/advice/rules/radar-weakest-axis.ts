/**
 * R04: レーダー最弱軸 診断
 *
 * Source: empirical (∀ε氏 重み序列: 表現力 > 安定性 ≒ V&L > リズム)
 * Confidence: high (軸値そのものは DAM 公式出力)
 *
 * 5 軸のうち最低値が他軸平均から一定以上離れていれば、「まずそこを埋める」
 * アドバイスを出す。軽微な差なら findings なし。
 */

import { RADAR_WEAKEST_GAP } from "../thresholds";
import type { Finding, ScoreInput } from "../types";

type AxisKey =
  | "pitch"
  | "stability"
  | "expression"
  | "vibrato_longtone"
  | "rhythm";

const AXIS_LABELS: Record<AxisKey, string> = {
  pitch: "音程",
  stability: "安定性",
  expression: "表現力",
  vibrato_longtone: "ビブラート&ロングトーン",
  rhythm: "リズム",
};

/** Short practical hint paired with each axis. */
const AXIS_HINTS: Record<AxisKey, string> = {
  pitch: "ガイドメロディをオンにして正確な音取りの練習が効きます。",
  stability: "ロングトーンで声を揺らさず一定に出す練習が効きます。",
  expression: "強弱比 1:2 の抑揚と、裏技法 (アクセント / ハンマリング) を意識。",
  vibrato_longtone: "ビブラートは B-3 / C-3 (周期中〜遅・振幅深) を目標に、1 秒以上つなげる。",
  rhythm: "Ai は走り判定が出やすいので、1 拍遅らせる意識でタメ気味に。",
};

export function evaluateRadarWeakestAxis(score: ScoreInput): Finding[] {
  const axes: Array<{ key: AxisKey; value: number }> = [];
  if (score.pitch_score !== null) axes.push({ key: "pitch", value: score.pitch_score });
  if (score.stability_score !== null) axes.push({ key: "stability", value: score.stability_score });
  if (score.expression_score !== null) axes.push({ key: "expression", value: score.expression_score });
  if (score.vibrato_longtone_score !== null) axes.push({ key: "vibrato_longtone", value: score.vibrato_longtone_score });
  if (score.rhythm_score !== null) axes.push({ key: "rhythm", value: score.rhythm_score });

  // Need at least 3 axes for a meaningful "weakest vs. rest" comparison.
  if (axes.length < 3) return [];

  // Find the minimum; compute the mean of the OTHER axes to avoid self-contamination.
  axes.sort((a, b) => a.value - b.value);
  const weakest = axes[0];
  const othersMean =
    axes.slice(1).reduce((s, a) => s + a.value, 0) / (axes.length - 1);
  const gap = othersMean - weakest.value;

  if (gap < RADAR_WEAKEST_GAP) return [];

  return [
    {
      ruleId: "R04.weakest_axis",
      severity: "tip",
      title: `まず「${AXIS_LABELS[weakest.key]}」を底上げ`,
      message:
        `${AXIS_LABELS[weakest.key]} が ${weakest.value} で他 4 軸平均 ${othersMean.toFixed(1)} と比べて ${gap.toFixed(1)} 点ビハインド。` +
        ` ${AXIS_HINTS[weakest.key]}`,
      metrics: {
        weakest_value: weakest.value,
        others_mean: round1(othersMean),
        gap: round1(gap),
      },
      source: "empirical",
      confidence: "high",
    },
  ];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
