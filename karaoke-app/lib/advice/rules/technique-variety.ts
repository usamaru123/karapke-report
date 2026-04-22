/**
 * R07: 技法単調性 診断
 *
 * Source: empirical (ナレッジ §5 "技法の単調化" 対策)
 * Confidence: medium
 *
 * 8 種技法 (kobushi/shakuri/fall/vibrato/accent/hammering/edgeVoice/hiccup)
 * のうち、実使用された (count > 0) カテゴリ数をカウントする。2 種以下なら
 * 「裏技法を混ぜる」助言。
 */

import {
  extractTechniqueCounts,
  techniqueVariety,
} from "../raw-xml-extract";
import { TECHNIQUE_VARIETY_MIN } from "../thresholds";
import type { Finding, ScoreInput } from "../types";

export function evaluateTechniqueVariety(score: ScoreInput): Finding[] {
  if (score.raw_xml === null || score.raw_xml === undefined) return [];

  const counts = extractTechniqueCounts(score.raw_xml);
  // All nulls → no data available (older sync without technique fields).
  const allNull = Object.values(counts).every((v) => v === null);
  if (allNull) return [];

  const variety = techniqueVariety(counts);
  if (variety > TECHNIQUE_VARIETY_MIN) return [];

  // List the categories the user DID use, for context.
  const used: string[] = [];
  if ((counts.kobushi ?? 0) > 0) used.push("こぶし");
  if ((counts.shakuri ?? 0) > 0) used.push("しゃくり");
  if ((counts.fall ?? 0) > 0) used.push("フォール");
  if ((counts.vibrato ?? 0) > 0) used.push("ビブラート");
  if ((counts.accent ?? 0) > 0) used.push("アクセント");
  if ((counts.hammering ?? 0) > 0) used.push("ハンマリング");
  if ((counts.edgeVoice ?? 0) > 0) used.push("エッジボイス");
  if ((counts.hiccup ?? 0) > 0) used.push("ヒーカップ");

  return [
    {
      ruleId: "R07.monotone",
      severity: "tip",
      title: "技法が単調",
      message:
        `使用技法は ${variety} 種 (${used.join(" / ") || "なし"})。` +
        "Ai 感性は技法の多様性で加点されやすい傾向です。未使用の技法 " +
        "(特にアクセント・ハンマリング・エッジボイス) を混ぜると素点が同じでもボーナスが伸びる可能性があります。",
      metrics: {
        variety,
        kobushi: counts.kobushi ?? 0,
        shakuri: counts.shakuri ?? 0,
        fall: counts.fall ?? 0,
        vibrato: counts.vibrato ?? 0,
        accent: counts.accent ?? 0,
        hammering: counts.hammering ?? 0,
        edge_voice: counts.edgeVoice ?? 0,
        hiccup: counts.hiccup ?? 0,
      },
      source: "empirical",
      confidence: "medium",
    },
  ];
}
