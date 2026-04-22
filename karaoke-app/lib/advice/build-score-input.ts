/**
 * Bridge the DB-native `Score` / `Song` rows into the normalized `ScoreInput`
 * shape consumed by every rule.
 *
 * Two reasons this exists:
 *   1. Supabase returns NUMERIC columns (total_score, ai_bonus, radar axes)
 *      as strings in most configs. Rules expect numbers, so we coerce once.
 *   2. Song range lives on the `song` row; user range lives on a separate
 *      aggregate. The rules want both in a flat object. We assemble here.
 *
 * Pure function — no I/O.
 */

import type { UserVocalRange } from "@/lib/queries/user_range";
import type { Score, Song } from "@/types/domain";
import type { ScoreInput } from "./types";

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toNumber(v: unknown, fallback: number): number {
  const n = toNumberOrNull(v);
  return n ?? fallback;
}

export function buildScoreInput(
  score: Score,
  song: Song,
  userRange: UserVocalRange,
): ScoreInput {
  return {
    id: score.id,
    scoring_type: score.scoring_type,
    total_score: toNumber(score.total_score, 0),
    pitch_score: toNumberOrNull(score.pitch_score),
    stability_score: toNumberOrNull(score.stability_score),
    expression_score: toNumberOrNull(score.expression_score),
    vibrato_longtone_score: toNumberOrNull(score.vibrato_longtone_score),
    rhythm_score: toNumberOrNull(score.rhythm_score),
    ai_bonus: toNumberOrNull(score.ai_bonus),
    intonation: toNumberOrNull(score.intonation),
    key_control: toNumber(score.key_control, 0),
    singing_range_lowest: toNumberOrNull(score.singing_range_lowest),
    singing_range_highest: toNumberOrNull(score.singing_range_highest),
    song_range_lowest: toNumberOrNull(song.vocal_range_lowest),
    song_range_highest: toNumberOrNull(song.vocal_range_highest),
    user_range_low: userRange.low,
    user_range_high: userRange.high,
    raw_xml: score.raw_xml ?? null,
  };
}
