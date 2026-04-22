/**
 * R09: キー適合性 診断
 *
 * Source: empirical (ナレッジ §8 + 既存の lib/vocal-range.ts ロジック)
 * Confidence: high (verdict は既存 evaluateVocalRange の出力を直接使う)
 *
 * 曲の音域とユーザーの声域を比較し、key_tweak / hard なら「キー調整を検討」
 * のアドバイス。fits なら findings なし（他のルールに譲る）。
 */

import { evaluateVocalRange } from "@/lib/vocal-range";
import type { Finding, ScoreInput } from "../types";

export function evaluateKeyFitness(score: ScoreInput): Finding[] {
  const verdict = evaluateVocalRange(
    { low: score.song_range_lowest, high: score.song_range_highest },
    { low: score.user_range_low, high: score.user_range_high },
  );

  if (verdict.kind === "fits" || verdict.kind === "unknown") return [];

  if (verdict.kind === "key_tweak") {
    const reasonWord =
      verdict.reason === "too_high"
        ? "高音側"
        : verdict.reason === "too_low"
          ? "低音側"
          : "高低両方";
    return [
      {
        ruleId: "R09.key_tweak",
        severity: "tip",
        title: "キー調整で楽になる可能性があります",
        message:
          `曲の${reasonWord}が自分の声域ギリギリ。` +
          `リモコンのキー変更は採点減点の対象外なので、${reasonWord}に ±1〜3 ずらすと表現力/安定性が上がる可能性があります。`,
        metrics: {
          low_margin: verdict.lowMargin,
          high_margin: verdict.highMargin,
          current_key_control: score.key_control,
        },
        source: "empirical",
        confidence: "high",
      },
    ];
  }

  // hard
  const reasonWord =
    verdict.reason === "too_high"
      ? "高音側"
      : verdict.reason === "too_low"
        ? "低音側"
        : "両端";
  return [
    {
      ruleId: "R09.key_hard",
      severity: "warn",
      title: "現キーでは声域不足の可能性",
      message:
        `${reasonWord}が声域を大きく超えています (余裕 ${Math.min(verdict.lowMargin, verdict.highMargin)} 半音)。` +
        `キーを調整しないと表現力・安定性が犠牲になります。`,
      metrics: {
        low_margin: verdict.lowMargin,
        high_margin: verdict.highMargin,
        current_key_control: score.key_control,
      },
      source: "empirical",
      confidence: "high",
    },
  ];
}
