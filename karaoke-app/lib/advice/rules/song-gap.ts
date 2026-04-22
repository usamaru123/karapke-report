/**
 * R24: 得意曲 vs 苦手曲 診断
 *
 * Source: empirical
 * Confidence: high
 *
 * 曲ごとの best_score を集計し、最高曲と最低曲の差が SONG_GAP_MIN 以上
 * あれば「得意曲で掴んだコツを苦手曲に転用」の info を出す。
 */

import { SONG_GAP_MIN, SONG_GAP_MIN_SONGS } from "../thresholds";
import type { Finding, ScoreHistoryInput } from "../types";

export function evaluateSongGap(input: ScoreHistoryInput): Finding[] {
  // Tally per-song best.
  const bestPerSong = new Map<
    string,
    { title: string; best: number; count: number }
  >();
  for (const s of input.scores) {
    const entry = bestPerSong.get(s.song_id);
    if (entry) {
      entry.count += 1;
      if (s.total_score > entry.best) entry.best = s.total_score;
    } else {
      bestPerSong.set(s.song_id, {
        title: s.song_title,
        best: s.total_score,
        count: 1,
      });
    }
  }
  if (bestPerSong.size < SONG_GAP_MIN_SONGS) return [];

  const arr = [...bestPerSong.values()];
  arr.sort((a, b) => b.best - a.best);
  const topSong = arr[0];
  const bottomSong = arr[arr.length - 1];
  const gap = topSong.best - bottomSong.best;
  if (gap < SONG_GAP_MIN) return [];

  return [
    {
      ruleId: "R24.song_gap",
      severity: "info",
      title: "得意曲のコツを苦手曲に転用してみよう",
      message:
        `「${topSong.title}」(ベスト ${topSong.best.toFixed(2)}) と「${bottomSong.title}」(ベスト ${bottomSong.best.toFixed(2)}) の差は ${gap.toFixed(1)} 点。` +
        " 得意曲で自然にできている抑揚や裏技法を意識して苦手曲にも当てはめると伸びやすいです。",
      metrics: {
        top_best: round2(topSong.best),
        bottom_best: round2(bottomSong.best),
        gap: round2(gap),
        song_count: arr.length,
      },
      source: "empirical",
      confidence: "high",
    },
  ];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
