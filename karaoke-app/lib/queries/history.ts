import { createClient } from "@/lib/supabase/server";
import type { Score, Session } from "@/types/domain";

export type PeriodFilter = "this_month" | "this_year" | "all";

export type HistoryScoreRow = Pick<
  Score,
  "id" | "sung_at" | "total_score" | "key_control"
> & {
  song: { id: string; title: string; artist: string } | null;
};

export type HistorySession = Session & { scores: HistoryScoreRow[] };

export async function getHistoryWithSessions(opts?: {
  period?: PeriodFilter;
}): Promise<HistorySession[]> {
  const supabase = await createClient();

  let fromDate: string | null = null;
  const now = new Date();
  if (opts?.period === "this_month") {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  } else if (opts?.period === "this_year") {
    fromDate = new Date(now.getFullYear(), 0, 1).toISOString();
  }

  let query = supabase
    .from("sessions")
    .select(
      `
      *,
      scores:scores(
        id, sung_at, total_score, key_control,
        song:songs(id, title, artist)
      )
    `,
    )
    .order("started_at", { ascending: false });

  if (fromDate) {
    query = query.gte("started_at", fromDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as HistorySession[];

  return rows.map((session) => ({
    ...session,
    scores: [...session.scores].sort((a, b) =>
      a.sung_at.localeCompare(b.sung_at),
    ),
  }));
}

export async function getScoresForSong(
  songId: string,
  limit = 10,
): Promise<Score[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("song_id", songId)
    .order("sung_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Score[];
}
