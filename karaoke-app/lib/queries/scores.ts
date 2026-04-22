import { createClient } from "@/lib/supabase/server";
import type { Score, Song } from "@/types/domain";

export type ScoreDetail = {
  score: Score;
  song: Song;
  /**
   * Optional 24-section pitch data when `detailFlg=1` was captured at sync
   * time. Null when the sync didn't store per-section points.
   */
  pitchIntervals: number[] | null;
};

/**
 * Fetch a single score + its song + 24-interval pitch data for the
 * /scores/[id] detail page. RLS scopes rows to the authenticated user.
 */
export async function getScoreDetail(
  scoreId: string,
): Promise<ScoreDetail> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("scores")
    .select("*, song:songs(*)")
    .eq("id", scoreId)
    .single();
  if (error) throw error;

  const row = data as unknown as Score & { song: Song | null };
  if (!row.song) throw new Error("score has no song");

  // score_pitch_intervals is a separate table keyed by score_id.
  const { data: pi } = await supabase
    .from("score_pitch_intervals")
    .select("intervals")
    .eq("score_id", scoreId)
    .maybeSingle();

  const { song, ...scoreOnly } = row;

  return {
    score: scoreOnly as Score,
    song,
    pitchIntervals: (pi?.intervals as number[] | null | undefined) ?? null,
  };
}
