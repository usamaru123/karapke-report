import type { HistoryScorePoint } from "@/lib/advice/types";

/** Minimal HistoryScorePoint with sensible defaults for aggregate rule tests. */
export function buildHistoryScore(
  overrides: Partial<HistoryScorePoint> = {},
): HistoryScorePoint {
  return {
    id: "score-0",
    sung_at: "2026-04-01T12:00:00Z",
    song_id: "song-A",
    song_title: "Song A",
    total_score: 90,
    pitch_score: 85,
    stability_score: 85,
    expression_score: 85,
    vibrato_longtone_score: 85,
    rhythm_score: 90,
    ai_bonus: 3,
    key_control: 0,
    scoring_type: "ai",
    ...overrides,
  };
}
