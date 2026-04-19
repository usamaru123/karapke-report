import { createClient } from "@/lib/supabase/server";

export type DashboardSummary = {
  repertoireCount: number;
  totalScoreCount: number;
  averageScore: number | null;
  highScoreSongCount: number;
  lastSyncAt: string | null;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const supabase = await createClient();

  const [repCount, scoreCount, avgScore, highScoreCount, lastSyncAt] =
    await Promise.all([
      supabase.from("repertoire").select("*", { count: "exact", head: true }),
      supabase.from("scores").select("*", { count: "exact", head: true }),
      supabase.from("scores").select("total_score"),
      supabase.from("scores").select("song_id").gte("total_score", 90),
      supabase
        .from("sync_logs")
        .select("finished_at")
        .order("finished_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const totals = (avgScore.data ?? []).map((s) => Number(s.total_score));
  const avg = totals.length
    ? totals.reduce((a, t) => a + t, 0) / totals.length
    : null;

  const uniqueHighSongs = new Set(
    (highScoreCount.data ?? []).map((s) => s.song_id),
  ).size;

  return {
    repertoireCount: repCount.count ?? 0,
    totalScoreCount: scoreCount.count ?? 0,
    averageScore: avg,
    highScoreSongCount: uniqueHighSongs,
    lastSyncAt: lastSyncAt.data?.finished_at ?? null,
  };
}

export type HeroBest = {
  current: {
    total_score: number;
    sung_at: string;
    song: { title: string; artist: string } | null;
  } | null;
  isBestUpdated: boolean;
};

export async function getHeroBest(): Promise<HeroBest> {
  const supabase = await createClient();
  const now = new Date();
  const firstOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();

  const { data } = await supabase
    .from("scores")
    .select("total_score, sung_at, song:songs(title, artist)")
    .gte("sung_at", firstOfMonth)
    .order("total_score", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: prevBest } = await supabase
    .from("scores")
    .select("total_score")
    .lt("sung_at", firstOfMonth)
    .order("total_score", { ascending: false })
    .limit(1)
    .maybeSingle();

  const current = data as unknown as HeroBest["current"];
  const isBestUpdated =
    current && prevBest
      ? Number(current.total_score) > Number(prevBest.total_score)
      : false;

  return { current, isBestUpdated };
}

export type RecentScore = {
  id: string;
  total_score: number;
  sung_at: string;
  song: { title: string; artist: string } | null;
};

export async function getRecentScores(limit = 5): Promise<RecentScore[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("id, total_score, sung_at, song:songs(title, artist)")
    .order("sung_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as RecentScore[];
}
