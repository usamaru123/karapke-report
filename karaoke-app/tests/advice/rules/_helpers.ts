import type { ScoreInput } from "@/lib/advice/types";

/** Baseline valid ScoreInput for tests — override only the fields you need. */
export function buildScore(overrides: Partial<ScoreInput> = {}): ScoreInput {
  return {
    id: "test-id",
    scoring_type: "ai",
    total_score: 90,
    pitch_score: 85,
    stability_score: 85,
    expression_score: 85,
    vibrato_longtone_score: 85,
    rhythm_score: 92,
    ai_bonus: 3.5,
    intonation: 75,
    key_control: 0,
    singing_range_lowest: 50,
    singing_range_highest: 72,
    song_range_lowest: 50,
    song_range_highest: 72,
    user_range_low: 48,
    user_range_high: 74,
    ...overrides,
  };
}
