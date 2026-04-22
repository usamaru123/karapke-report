/**
 * R11: Ai 感性 減点区間 診断
 *
 * Source: empirical (raw_xml `aiSensitivityGraphDeductPointsSection01..24`
 *                    は DAM が返す 24 区間ごとの減点値)
 * Confidence: medium (減点値の絶対スケール意味は非公開)
 *
 * 24 区間のうち最大減点値が閾値を超えていれば、「曲のどこで失点したか」を
 * 具体的に指摘する。メロディセクションフラグが取れれば B'01 群 / B'10 群
 * ラベルも添える (§3.2 参照、将来 R14 で精緻化)。
 */

import { extractIntervalGraph } from "../raw-xml-extract";
import { AI_DEDUCT_SEGMENT_THRESHOLD } from "../thresholds";
import type { Finding, ScoreInput } from "../types";

export function evaluateAiDeductSegment(score: ScoreInput): Finding[] {
  if (score.raw_xml === null || score.raw_xml === undefined) return [];

  const graph = extractIntervalGraph(score.raw_xml);
  if (graph.aiDeductPoints === null) return [];

  const deducts = graph.aiDeductPoints;
  let maxVal = 0;
  let maxIdx = -1;
  for (let i = 0; i < deducts.length; i++) {
    if (deducts[i] > maxVal) {
      maxVal = deducts[i];
      maxIdx = i;
    }
  }

  if (maxVal < AI_DEDUCT_SEGMENT_THRESHOLD) return [];

  const sectionNo = maxIdx + 1; // human-friendly 1-indexed
  const flag = graph.sectionFlags?.[maxIdx] ?? null;
  const sectionLabel =
    flag === null
      ? `区間 ${sectionNo}/24`
      : `区間 ${sectionNo}/24 (${flag} 群)`;

  return [
    {
      ruleId: "R11.deduct_segment",
      severity: "tip",
      title: `${sectionLabel} で Ai 感性減点が大きい`,
      message:
        `その区間だけで ${maxVal} の減点値が付いています (他区間は 0 前後)。` +
        "該当区間の歌唱を聴き直し、声の張り / 抑揚 / 音程ブレを確認してください。",
      metrics: {
        section: sectionNo,
        deduct_value: maxVal,
      },
      source: "empirical",
      confidence: "medium",
    },
  ];
}
