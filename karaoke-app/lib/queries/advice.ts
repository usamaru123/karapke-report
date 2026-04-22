/**
 * Queries that feed the aggregate advice engine (S3 rules).
 *
 * Returns everything in one round-trip so the repertoire-detail Server
 * Component doesn't cascade a second network call just for aggregate advice.
 */

import { createClient } from "@/lib/supabase/server";
import type { Score, Song } from "@/types/domain";

export type AggregateAdviceData = {
  /** Every Score row for the caller (RLS scoped to auth.uid). */
  scores: Score[];
  /** Song metadata keyed by id — only for songs that appear in scores. */
  songsById: Map<string, Pick<Song, "id" | "title">>;
};

export async function getAggregateAdviceData(): Promise<AggregateAdviceData> {
  const supabase = await createClient();

  const { data: scores, error: scoreErr } = await supabase
    .from("scores")
    .select("*");
  if (scoreErr) throw scoreErr;
  const scoreList = (scores ?? []) as Score[];

  // Collect unique song_ids → one song query.
  const songIds = [...new Set(scoreList.map((s) => s.song_id))];
  const songsById = new Map<string, Pick<Song, "id" | "title">>();
  if (songIds.length > 0) {
    const { data: songs, error: songErr } = await supabase
      .from("songs")
      .select("id, title")
      .in("id", songIds);
    if (songErr) throw songErr;
    for (const s of songs ?? []) {
      songsById.set(s.id, { id: s.id, title: s.title });
    }
  }

  return { scores: scoreList, songsById };
}
