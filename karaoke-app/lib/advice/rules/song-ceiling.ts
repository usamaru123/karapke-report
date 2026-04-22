/**
 * R13: 曲天井接近 診断
 *
 * Source: inferred
 * Confidence: low
 *
 * DAM は `maxTotalPoints` という 1000 倍スケールの値を raw_xml に返す。
 * 5 件サンプルでは全件 `total_score < maxTotalPoints` が成立したため、
 * 「この歌唱の理論的最大点」という仮説を立てているが、意味は公式非公開。
 *
 * 保守的な実装:
 *   - `max - total >= 1.0` なら何も表示しない (仮説不成立の可能性)
 *   - `max - total < 1.0` なら「天井近い」info (仮説肯定的な範囲)
 *   - UI には「推定」「低確度」を明示
 *
 * 今後、別曲の複数歌唱サンプルで挙動確認できれば、severity を tip に
 * 引き上げ / 文言を具体化する。
 */

import { extractMaxTotalPoints } from "../raw-xml-extract";
import { CEILING_CLOSE_DELTA } from "../thresholds";
import type { Finding, ScoreInput } from "../types";

export function evaluateSongCeiling(score: ScoreInput): Finding[] {
  if (score.raw_xml === null || score.raw_xml === undefined) return [];

  const max = extractMaxTotalPoints(score.raw_xml);
  if (max === null) return [];

  const diff = max - score.total_score;

  // Sanity: the max should not be below the scored total. If it is, the
  // hypothesis is wrong for this record — silently skip.
  if (diff < 0) return [];

  if (diff >= CEILING_CLOSE_DELTA) return [];

  return [
    {
      ruleId: "R13.near_ceiling",
      severity: "info",
      title: "曲の推定上限に接近しています",
      message:
        `DAM が返す maxTotalPoints (${max.toFixed(3)}) まであと ${diff.toFixed(3)} 点。` +
        " この曲での伸び代が小さい可能性があります。別曲に挑戦すると総合的なスコア成長が早いかもしれません。" +
        " ※ maxTotalPoints の正確な意味は DAM 非公開のため、このアドバイスは参考値です。",
      metrics: {
        max_total_points: round3(max),
        total_score: round3(score.total_score),
        delta: round3(diff),
      },
      source: "inferred",
      confidence: "low",
    },
  ];
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
