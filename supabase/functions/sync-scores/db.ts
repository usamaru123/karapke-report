/**
 * Supabase write layer (Deno port of poc/karaoke-sync-poc/src/db.py).
 * Uses the service-role client so RLS does not block writes; all writes are
 * scoped to the user_id passed in by the caller.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedScore } from "./parser.ts";
import type { SessionGroup } from "./session_boundary.ts";

type Supa = SupabaseClient;

async function upsertSong(
  supa: Supa,
  title: string,
  artist: string,
  requestNo: string | null,
  damContentsId: string | null,
): Promise<string> {
  // songs is a shared catalog; title/artist carry generated-column
  // normalized forms (title_normalized, artist_normalized) via STORED gen.
  // onConflict target the unique pair.
  const { data, error } = await supa
    .from("songs")
    .upsert(
      {
        title,
        artist,
        request_no: requestNo,
        dam_contents_id: damContentsId,
      },
      { onConflict: "title_normalized,artist_normalized" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

async function ensureSession(
  supa: Supa,
  userId: string,
  group: SessionGroup,
): Promise<string> {
  // Upsert session keyed by (user_id, started_at). The table has no such
  // unique constraint; instead we look it up first, insert if missing.
  const { data: existing } = await supa
    .from("sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("started_at", group.started_at.toISOString())
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data, error } = await supa
    .from("sessions")
    .insert({
      user_id: userId,
      started_at: group.started_at.toISOString(),
      ended_at: group.ended_at.toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

type UpsertScoreResult = "inserted" | "skipped";

async function upsertScore(
  supa: Supa,
  userId: string,
  sessionId: string,
  songId: string,
  score: ParsedScore,
): Promise<UpsertScoreResult> {
  // Scores uniqueness is on dam_scoring_id. A 23505 conflict means we've
  // already ingested this row — safe to skip silently.
  const { data, error } = await supa
    .from("scores")
    .insert({
      user_id: userId,
      song_id: songId,
      session_id: sessionId,
      scoring_type: score.scoring_type,
      dam_scoring_id: score.dam_scoring_id,
      sung_at: score.sung_at.toISOString(),
      total_score: score.total_score,
      pitch_score: score.pitch_score,
      stability_score: score.stability_score,
      expression_score: score.expression_score,
      vibrato_longtone_score: score.vibrato_longtone_score,
      rhythm_score: score.rhythm_score,
      ai_bonus: score.ai_bonus,
      key_control: score.key_control,
      tempo_control: score.tempo_control,
      guide_melody: score.guide_melody,
      singing_range_lowest: score.singing_range_lowest,
      singing_range_highest: score.singing_range_highest,
      vocal_range_lowest: score.vocal_range_lowest,
      vocal_range_highest: score.vocal_range_highest,
      raw_xml: score.raw_xml,
    })
    .select("id")
    .single();
  if (error) {
    // deno-lint-ignore no-explicit-any
    if ((error as any).code === "23505") return "skipped";
    throw error;
  }
  const scoreId = (data as { id: string }).id;
  if (score.pitch_intervals && score.pitch_intervals.length === 24) {
    // Single-row-per-score: intervals is an int[] (CHECK array_length = 24).
    const { error: piErr } = await supa
      .from("score_pitch_intervals")
      .insert({
        score_id: scoreId,
        user_id: userId,
        intervals: score.pitch_intervals,
      });
    // deno-lint-ignore no-explicit-any
    if (piErr && (piErr as any).code !== "23505") throw piErr;
  }
  return "inserted";
}

export type PersistResult = {
  new_scores: number;
  skipped_scores: number;
  sessions_created: number;
};

export async function persistGroups(
  supa: Supa,
  userId: string,
  groups: SessionGroup[],
): Promise<PersistResult> {
  let inserted = 0;
  let skipped = 0;
  let sessions_new = 0;

  for (const group of groups) {
    const { data: existing } = await supa
      .from("sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("started_at", group.started_at.toISOString())
      .maybeSingle();
    const sessionId = existing
      ? (existing as { id: string }).id
      : await (async () => {
          sessions_new++;
          return await ensureSession(supa, userId, group);
        })();

    for (const score of group.scores) {
      const songId = await upsertSong(
        supa,
        score.song_title,
        score.song_artist,
        score.request_no,
        score.dam_contents_id,
      );
      const result = await upsertScore(
        supa,
        userId,
        sessionId,
        songId,
        score,
      );
      if (result === "inserted") inserted++;
      else skipped++;
    }
  }

  return {
    new_scores: inserted,
    skipped_scores: skipped,
    sessions_created: sessions_new,
  };
}

export async function openSyncLog(
  supa: Supa,
  userId: string,
): Promise<string> {
  const { data, error } = await supa
    .from("sync_logs")
    .insert({
      user_id: userId,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function closeSyncLog(
  supa: Supa,
  logId: string,
  status: "success" | "partial" | "failed",
  payload: {
    scores_fetched?: number;
    scores_new?: number;
    error_message?: string;
  },
): Promise<void> {
  const { error } = await supa
    .from("sync_logs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      scores_fetched: payload.scores_fetched ?? 0,
      scores_new: payload.scores_new ?? 0,
      error_message: payload.error_message ?? null,
    })
    .eq("id", logId);
  if (error) throw error;
}
