/**
 * R14: メロディセクション区分 診断
 *
 * Source: inferred (raw_xml の `aiSensitivityGraphIndexSection01..24` は
 *                   "B'01" / "B'10" の 2 値フラグで 24 区間を 2 群に分類している。
 *                   A メロ / B メロ / サビのどれが B'01 / B'10 に対応するかは
 *                   未検証)
 * Confidence: low
 *
 * 24 区間を B'01 群と B'10 群に分け、それぞれの音程平均スコアを比較。
 * 差が一定以上あれば「弱い群がある」と指摘。意味判明まで抽象ラベル
 * 「セクション A / セクション B」で提示する (B'01/B'10 という生タグは
 * 詳細パネルに出す)。
 */

import { extractIntervalGraph } from "../raw-xml-extract";
import { SECTION_GROUP_GAP_MIN } from "../thresholds";
import type { Finding, ScoreInput } from "../types";

export function evaluateMelodySection(score: ScoreInput): Finding[] {
  if (score.raw_xml === null || score.raw_xml === undefined) return [];

  const graph = extractIntervalGraph(score.raw_xml);
  if (graph.pitchPoints === null || graph.sectionFlags === null) return [];

  const groupA: number[] = []; // "B'01"
  const groupB: number[] = []; // "B'10"
  for (let i = 0; i < 24; i++) {
    const flag = graph.sectionFlags[i];
    const p = graph.pitchPoints[i];
    if (flag === "B'01") groupA.push(p);
    else if (flag === "B'10") groupB.push(p);
  }

  // Need both groups populated to compare.
  if (groupA.length === 0 || groupB.length === 0) return [];

  const avgA = mean(groupA);
  const avgB = mean(groupB);
  const gap = Math.abs(avgA - avgB);
  if (gap < SECTION_GROUP_GAP_MIN) return [];

  const weakLabel = avgA < avgB ? "セクション A (B'01)" : "セクション B (B'10)";
  const strongLabel = avgA < avgB ? "セクション B (B'10)" : "セクション A (B'01)";
  const weakAvg = Math.min(avgA, avgB);
  const strongAvg = Math.max(avgA, avgB);

  return [
    {
      ruleId: "R14.weak_section_group",
      severity: "tip",
      title: `${weakLabel} が弱い`,
      message:
        `${weakLabel} の平均音程スコアは ${weakAvg.toFixed(1)}、${strongLabel} は ${strongAvg.toFixed(1)} (差 ${gap.toFixed(1)})。` +
        " 弱い群を集中練習すると全体の音程スコアが上がります。セクション A/B の曲中位置は未検証です (A/B メロ or サビと推定)。",
      metrics: {
        group_a_avg: round1(avgA),
        group_b_avg: round1(avgB),
        gap: round1(gap),
        group_a_count: groupA.length,
        group_b_count: groupB.length,
      },
      source: "inferred",
      confidence: "low",
    },
  ];
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, n) => s + n, 0) / arr.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
