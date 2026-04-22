/**
 * R10: Ai Heart 100 点ルーレット注記
 *
 * Source: official (こじがみさま氏解析 + 公式仕様)
 * Confidence: high
 *
 * Ai Heart では 99.950 以上の歌唱で二段階ルーレット抽選が走り、100.000 は
 * 出現率約 0.294%。この情報は「頑張っても運要素」であることを事実として
 * 伝える info メッセージ。ネガティブにならないよう文言に注意。
 */

import { HEART_ROULETTE_FLOOR } from "../thresholds";
import type { Finding, ScoreInput } from "../types";

export function evaluateHeartRouletteNote(score: ScoreInput): Finding[] {
  if (score.scoring_type !== "ai_heart") return [];
  if (score.total_score < HEART_ROULETTE_FLOOR) return [];

  return [
    {
      ruleId: "R10.heart_roulette",
      severity: "info",
      title: "ルーレット対象に到達しています",
      message:
        `総合 ${score.total_score.toFixed(3)} は Ai Heart の二段階ルーレット抽選対象 (${HEART_ROULETTE_FLOOR}+)。` +
        `100.000 点到達は約 0.3% の運要素が含まれると公知。歌唱品質はこの水準で既に到達済みです。`,
      metrics: { total_score: score.total_score },
      source: "official",
      confidence: "high",
    },
  ];
}
