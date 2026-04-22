/**
 * R06: リズム走り/タメ 診断
 *
 * Source: empirical (ナレッジ §3: "精密採点 Ai は全般に走り判定が出やすい。
 * 少しタメ気味に発声するのがスコアラー定石")
 * Confidence: medium
 *
 * rhythm_score が明確に低い場合のみ、走り気味警告を出す。
 * タメ/走りの方向判別は raw_xml の `timing` フィールドからできる可能性が
 * あるが、値の解釈が未確定のため今は使わない (将来の拡張ポイント)。
 */

import { RHYTHM_SCORE_TIP_BELOW } from "../thresholds";
import type { Finding, ScoreInput } from "../types";

export function evaluateRhythmTiming(score: ScoreInput): Finding[] {
  if (score.rhythm_score === null) return [];
  if (score.rhythm_score >= RHYTHM_SCORE_TIP_BELOW) return [];

  return [
    {
      ruleId: "R06.rushed_suspect",
      severity: "tip",
      title: "リズムで失点しています",
      message:
        `リズムスコア ${score.rhythm_score}。精密採点 Ai は走り判定が出やすい仕様として知られています。` +
        `1 拍遅らせる / バーの始点を感じるくらいタメ気味に発声すると改善する傾向があります。`,
      metrics: { rhythm_score: score.rhythm_score },
      source: "empirical",
      confidence: "medium",
    },
  ];
}
