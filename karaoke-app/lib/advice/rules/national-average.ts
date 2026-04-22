/**
 * R12: 全国平均比較 診断
 *
 * Source: empirical (raw_xml の nationalAverage* は DAM が当該曲の全国平均
 *                    を返すフィールド)
 * Confidence: medium
 *
 * 自スコアの 5 軸を全国平均と比較し、「平均 - 5 以下」の軸を「伸びしろ」、
 * 「平均 + 10 以上」の軸を「得意」として指摘する。
 *
 * 文言には注意: 「平均以下」は自尊心を傷付け得るので tip 寄せ、「伸びしろ」
 * として提示する。
 */

import { extractNationalAverage } from "../raw-xml-extract";
import {
  NATIONAL_AVG_GROWTH_DELTA,
  NATIONAL_AVG_STRENGTH_DELTA,
} from "../thresholds";
import type { Finding, ScoreInput } from "../types";

type AxisLabel = {
  selfKey: keyof Pick<
    ScoreInput,
    | "pitch_score"
    | "stability_score"
    | "expression_score"
    | "vibrato_longtone_score"
    | "rhythm_score"
  >;
  avgKey: "pitch" | "stability" | "expression" | "vibratoAndLongtone" | "rhythm";
  jp: string;
};

const AXES: AxisLabel[] = [
  { selfKey: "pitch_score", avgKey: "pitch", jp: "音程" },
  { selfKey: "stability_score", avgKey: "stability", jp: "安定性" },
  { selfKey: "expression_score", avgKey: "expression", jp: "表現力" },
  {
    selfKey: "vibrato_longtone_score",
    avgKey: "vibratoAndLongtone",
    jp: "ビブラート&ロングトーン",
  },
  { selfKey: "rhythm_score", avgKey: "rhythm", jp: "リズム" },
];

export function evaluateNationalAverage(score: ScoreInput): Finding[] {
  if (score.raw_xml === null || score.raw_xml === undefined) return [];

  const avg = extractNationalAverage(score.raw_xml);
  const strengths: Array<{ jp: string; self: number; avg: number }> = [];
  const growths: Array<{ jp: string; self: number; avg: number }> = [];

  for (const axis of AXES) {
    const self = score[axis.selfKey];
    const mean = avg[axis.avgKey];
    if (self === null || mean === null) continue;
    const delta = self - mean;
    if (delta >= NATIONAL_AVG_STRENGTH_DELTA) {
      strengths.push({ jp: axis.jp, self, avg: mean });
    } else if (delta <= -NATIONAL_AVG_GROWTH_DELTA) {
      growths.push({ jp: axis.jp, self, avg: mean });
    }
  }

  const findings: Finding[] = [];

  // Growth tip: pick the single most behind axis (avoid spamming 5 messages).
  if (growths.length > 0) {
    growths.sort((a, b) => a.self - a.avg - (b.self - b.avg));
    const g = growths[0];
    findings.push({
      ruleId: "R12.growth_room",
      severity: "tip",
      title: `「${g.jp}」に伸びしろ`,
      message:
        `自スコア ${g.self} vs 全国平均 ${g.avg} (差 ${(g.self - g.avg).toFixed(1)})。この軸は他ユーザーに比べて下がっており、底上げ効果が大きい軸です。`,
      metrics: {
        self: g.self,
        national_average: g.avg,
        delta: Math.round((g.self - g.avg) * 10) / 10,
      },
      source: "empirical",
      confidence: "medium",
    });
  }

  // Strength info: pick the top one for positive reinforcement.
  if (strengths.length > 0) {
    strengths.sort((a, b) => b.self - b.avg - (a.self - a.avg));
    const s = strengths[0];
    findings.push({
      ruleId: "R12.strength",
      severity: "info",
      title: `「${s.jp}」は得意軸`,
      message:
        `自スコア ${s.self} vs 全国平均 ${s.avg} (差 +${(s.self - s.avg).toFixed(1)})。全国平均を大きく上回っています。`,
      metrics: {
        self: s.self,
        national_average: s.avg,
        delta: Math.round((s.self - s.avg) * 10) / 10,
      },
      source: "empirical",
      confidence: "medium",
    });
  }

  return findings;
}
