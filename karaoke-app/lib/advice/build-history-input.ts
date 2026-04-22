/**
 * Build a ScoreHistoryInput for the aggregate engine (S3 rules) from DB rows.
 *
 * Aggregate rules don't pierce raw_xml, so we only project the columns they
 * actually use. Supabase NUMERIC-as-string → number coercion lives here too.
 */

import type { Score, Song } from "@/types/domain";
import type { HistoryScorePoint, ScoreHistoryInput } from "./types";

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toNumber(v: unknown, fallback: number): number {
  return toNumberOrNull(v) ?? fallback;
}

export function buildHistoryInput(
  scores: Score[],
  songsById: Map<string, Pick<Song, "id" | "title">>,
  focusSongId?: string,
): ScoreHistoryInput {
  const points: HistoryScorePoint[] = scores.map((s) => ({
    id: s.id,
    sung_at: s.sung_at,
    song_id: s.song_id,
    song_title: songsById.get(s.song_id)?.title ?? "(unknown)",
    total_score: toNumber(s.total_score, 0),
    pitch_score: toNumberOrNull(s.pitch_score),
    stability_score: toNumberOrNull(s.stability_score),
    expression_score: toNumberOrNull(s.expression_score),
    vibrato_longtone_score: toNumberOrNull(s.vibrato_longtone_score),
    rhythm_score: toNumberOrNull(s.rhythm_score),
    ai_bonus: toNumberOrNull(s.ai_bonus),
    key_control: toNumber(s.key_control, 0),
    scoring_type: s.scoring_type,
  }));

  return { scores: points, focusSongId };
}
