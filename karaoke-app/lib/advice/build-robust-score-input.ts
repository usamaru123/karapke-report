/**
 * Build a robust-stats-based ScoreInput for the single-score advice engine.
 *
 * Whereas `buildScoreInput` projects ONE score row, this variant aggregates
 * the **recent N same-song scores** via trimmed mean so a single bad/good
 * take doesn't flip every rule's finding.
 *
 * Policy (kept in one place so S6 feedback tuning is localized):
 *   - Window: last 10 same-song scores (or all if fewer).
 *   - Center: trimmed mean (drops ~25% from each end; median fallback).
 *   - raw_xml: taken from the single most-recent score that has one. Rules
 *     needing per-segment data (R05 / R07 / R11 / R14 / R08) will still read
 *     from that. This is a trade-off — we could aggregate segment arrays,
 *     but that loses context and most rules need a concrete example anyway.
 *   - id: the latest score's id (so downstream links still resolve).
 *
 * Fields that are **cumulative** (key_control, scoring_type) are taken from
 * the latest score.
 */

import type { UserVocalRange } from "@/lib/queries/user_range";
import type { Score, Song } from "@/types/domain";
import { takeRecent, trimmedMean } from "./robust-stats";
import type { ScoreInput } from "./types";

const ROBUST_WINDOW = 10;

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toNumber(v: unknown, fallback: number): number {
  return toNumberOrNull(v) ?? fallback;
}

function centerOrNull(pickers: (number | null)[]): number | null {
  const values = pickers.filter((v): v is number => v !== null);
  return trimmedMean(values);
}

/**
 * Aggregate `scores` (same-song preferred) into a single ScoreInput. When
 * `scores` is empty, returns null — callers should treat it as "no advice".
 *
 * `scores` are expected to contain ONLY the song's own history; the caller
 * filters before passing. This keeps the helper ignorant of song boundaries.
 */
export function buildRobustScoreInput(
  scores: Score[],
  song: Song,
  userRange: UserVocalRange,
): ScoreInput | null {
  if (scores.length === 0) return null;

  const recent = takeRecent(scores, ROBUST_WINDOW, (s) => s.sung_at);
  const latest = recent[0]; // takeRecent returns newest-first

  // Prefer a raw_xml that actually has content — sync occasionally omits it.
  const rawXmlSource =
    recent.find((s) => s.raw_xml !== null && s.raw_xml !== undefined) ?? latest;

  return {
    id: latest.id,
    scoring_type: latest.scoring_type,
    total_score: centerOrNull(recent.map((s) => toNumberOrNull(s.total_score))) ?? 0,
    pitch_score: centerOrNull(recent.map((s) => toNumberOrNull(s.pitch_score))),
    stability_score: centerOrNull(
      recent.map((s) => toNumberOrNull(s.stability_score)),
    ),
    expression_score: centerOrNull(
      recent.map((s) => toNumberOrNull(s.expression_score)),
    ),
    vibrato_longtone_score: centerOrNull(
      recent.map((s) => toNumberOrNull(s.vibrato_longtone_score)),
    ),
    rhythm_score: centerOrNull(recent.map((s) => toNumberOrNull(s.rhythm_score))),
    ai_bonus: centerOrNull(recent.map((s) => toNumberOrNull(s.ai_bonus))),
    intonation: centerOrNull(recent.map((s) => toNumberOrNull(s.intonation))),
    key_control: toNumber(latest.key_control, 0),
    singing_range_lowest: toNumberOrNull(latest.singing_range_lowest),
    singing_range_highest: toNumberOrNull(latest.singing_range_highest),
    song_range_lowest: toNumberOrNull(song.vocal_range_lowest),
    song_range_highest: toNumberOrNull(song.vocal_range_highest),
    user_range_low: userRange.low,
    user_range_high: userRange.high,
    raw_xml: rawXmlSource.raw_xml ?? null,
  };
}

/** Exposed for tests. */
export const _ROBUST_WINDOW = ROBUST_WINDOW;
