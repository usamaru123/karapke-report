/**
 * R05: ビブラート型 診断
 *
 * Source: official (ビブラート判定窓 500ms / 周期 140-300ms は第一興商特許
 *                   JP2008015213A) + empirical (15 種分類と推奨型)
 * Confidence: medium (typeCode マッピング仮説が未確定)
 *
 * 「ノンビブ (N)」「ちりめんビブ (A 系)」「非ボックス (D-H)」は未検出 /
 * 低評価リスクが高い型。「B-3 / C-3」は高得点帯と知られる型。持続秒が
 * 極端に短い場合も別途警告する。
 */

import { extractVibratoMeta } from "../raw-xml-extract";
import { VIBRATO_TOTAL_SECONDS_MIN } from "../thresholds";
import type { Finding, ScoreInput } from "../types";
import {
  describeVibratoType,
  resolveVibratoType,
} from "../vibrato-type-map";

export function evaluateVibratoType(score: ScoreInput): Finding[] {
  if (score.raw_xml === null || score.raw_xml === undefined) return [];

  const meta = extractVibratoMeta(score.raw_xml);
  if (meta.typeCode === null && meta.totalSeconds === null) return [];

  const findings: Finding[] = [];
  const info = resolveVibratoType(meta.typeCode);

  // Case A: N (no vibrato detected)
  if (info?.label === "N") {
    findings.push({
      ruleId: "R05.no_vibrato",
      severity: "tip",
      title: "ノンビブ扱いです",
      message:
        "曲中のビブラート合計が 1 秒未満だと N 型 (未検出) 扱いになり評価対象外です。" +
        " B-3 / C-3 (中〜遅周期・深振幅) を目標に、まずロングトーン末尾で意識的に揺らす練習を。",
      metrics: {
        total_seconds: meta.totalSeconds ?? 0,
        count: meta.count ?? 0,
      },
      source: "official",
      confidence: "medium",
    });
    return findings;
  }

  // Case B: A 系 (短周期・ちりめんビブ)
  if (info?.period === "short") {
    findings.push({
      ruleId: "R05.chirimen",
      severity: "tip",
      title: `${info.label} (ちりめんビブ) — 高得点帯ではない`,
      message:
        `${describeVibratoType(meta.typeCode)}。周期が速めで振幅も浅い傾向です。` +
        " B-3 / C-3 (中〜遅い周期・振幅深め) を目標に、1 秒以上安定して揺らす練習を。",
      metrics: {
        type_code: meta.typeCode ?? -1,
        skill: meta.skill ?? 0,
        total_seconds: meta.totalSeconds ?? 0,
      },
      source: "empirical",
      confidence: "medium",
    });
  }

  // Case C: 非ボックス型 (D-H)
  if (info?.period === "non-box") {
    findings.push({
      ruleId: "R05.non_box",
      severity: "tip",
      title: `${info.label} (非ボックス型)`,
      message:
        `${describeVibratoType(meta.typeCode)}。ボックス判定に乗らない形状で、` +
        "B-3 / C-3 のような標準周期・深振幅を意識すると安定します。",
      metrics: {
        type_code: meta.typeCode ?? -1,
        skill: meta.skill ?? 0,
        total_seconds: meta.totalSeconds ?? 0,
      },
      source: "empirical",
      confidence: "medium",
    });
  }

  // Case D: 推奨型 (B-3 / C-3) — positive reinforcement
  if (info?.isRecommended) {
    findings.push({
      ruleId: "R05.recommended",
      severity: "info",
      title: `${info.label} — 高得点帯ビブラート`,
      message:
        `${describeVibratoType(meta.typeCode)} が検出されています。` +
        "この型は採点で有利とされています。持続時間を伸ばすとさらに評価が上がります。",
      metrics: {
        type_code: meta.typeCode ?? -1,
        skill: meta.skill ?? 0,
        total_seconds: meta.totalSeconds ?? 0,
      },
      source: "empirical",
      confidence: "medium",
    });
  }

  // Case E: 持続不足 (型とは独立に判定)
  if (
    meta.totalSeconds !== null &&
    meta.totalSeconds > 0 &&
    meta.totalSeconds < VIBRATO_TOTAL_SECONDS_MIN
  ) {
    findings.push({
      ruleId: "R05.short_duration",
      severity: "tip",
      title: "ビブラート持続が短い",
      message:
        `曲中の合計ビブラート時間が ${meta.totalSeconds} 秒。V&L 軸を伸ばすには 10 秒以上を目標に。`,
      metrics: { total_seconds: meta.totalSeconds },
      source: "empirical",
      confidence: "medium",
    });
  }

  return findings;
}
