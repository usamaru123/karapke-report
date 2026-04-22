/**
 * R20: 推奨キー集計 診断
 *
 * Source: empirical (既存 `lib/key-recommendation.ts` の recommendKey を再利用)
 * Confidence: medium (qualified キー数に依存)
 *
 * `focusSongId` 指定時のみ稼働 (曲詳細ページで意味を持つ)。同曲を複数キーで
 * 歌っている場合、平均スコア最高のキーを提案する。
 */

import { recommendKey } from "@/lib/key-recommendation";
import type { Finding, ScoreHistoryInput } from "../types";

export function evaluateKeyRecommendationAdvice(
  input: ScoreHistoryInput,
): Finding[] {
  if (!input.focusSongId) return [];
  const songScores = input.scores.filter(
    (s) => s.song_id === input.focusSongId,
  );
  if (songScores.length < 3) return [];

  const rec = recommendKey(
    songScores.map((s) => ({
      key_control: s.key_control,
      total_score: s.total_score,
    })),
  );
  if (rec.kind !== "recommended") return [];

  const others = rec.stats.filter((s) => s.key !== rec.bestKey);
  const currentPreferred = others.length > 0 ? others[0] : null;

  const formatKey = (k: number) => (k === 0 ? "原キー" : k > 0 ? `+${k}` : `${k}`);
  const messages = [
    `同曲の履歴から、${formatKey(rec.bestKey)} のときが最も平均スコアが高い (avg ${rec.best.avg.toFixed(1)}, 試行 ${rec.best.count} 回)。`,
  ];
  if (currentPreferred) {
    messages.push(
      `次点は ${formatKey(currentPreferred.key)} (avg ${currentPreferred.avg.toFixed(1)})。`,
    );
  }

  return [
    {
      ruleId: "R20.best_key",
      severity: "tip",
      title: `推奨キー: ${formatKey(rec.bestKey)}`,
      message: messages.join(" "),
      metrics: {
        best_key: rec.bestKey,
        best_avg: round1(rec.best.avg),
        best_count: rec.best.count,
      },
      source: "empirical",
      confidence: "medium",
    },
  ];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
