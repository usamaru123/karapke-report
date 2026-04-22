/**
 * R08: 24 区間音程弱点 診断
 *
 * Source: empirical
 * Confidence: high (生の区間ポイント値を直接比較するだけ)
 *
 * 24 区間の音程スコアのうち、最低区間が全体平均より大きくビハインドして
 * いるなら「この区間で大きく失点している」と指摘する。セクションフラグ
 * (B'01 / B'10) が取れれば群情報を添える。
 *
 * R14 メロディセクション区分 (群平均の比較) との使い分け:
 *   - R14: グループ間 (マクロ) の平均差
 *   - R08: 単一区間 (ミクロ) の突出した弱点
 */

import { extractIntervalGraph } from "../raw-xml-extract";
import { PITCH_SEGMENT_GAP_MIN } from "../thresholds";
import type { Finding, ScoreInput } from "../types";

export function evaluatePitchSegmentWeakness(
  score: ScoreInput,
): Finding[] {
  if (score.raw_xml === null || score.raw_xml === undefined) return [];

  const graph = extractIntervalGraph(score.raw_xml);
  if (graph.pitchPoints === null) return [];

  const points = graph.pitchPoints;
  const mean = points.reduce((s, p) => s + p, 0) / points.length;

  // Find the single minimum section. Ties broken by first occurrence.
  let minVal = points[0];
  let minIdx = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i] < minVal) {
      minVal = points[i];
      minIdx = i;
    }
  }

  const gap = mean - minVal;
  if (gap < PITCH_SEGMENT_GAP_MIN) return [];

  const sectionNo = minIdx + 1;
  const flag = graph.sectionFlags?.[minIdx] ?? null;
  const sectionLabel =
    flag === null
      ? `区間 ${sectionNo}/24`
      : `区間 ${sectionNo}/24 (${flag} 群)`;

  return [
    {
      ruleId: "R08.weak_segment",
      severity: "tip",
      title: `${sectionLabel} で音程が崩れている`,
      message:
        `その区間の音程スコアは ${minVal} で、曲全体平均 ${mean.toFixed(1)} から ${gap.toFixed(1)} 点ビハインドしています。` +
        " 該当区間を聞き直して、音程の跳躍や転調、低音/高音の張りを個別に確認してください。",
      metrics: {
        section: sectionNo,
        section_score: minVal,
        overall_mean: round1(mean),
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
