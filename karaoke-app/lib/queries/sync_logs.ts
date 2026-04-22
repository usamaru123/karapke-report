import { createClient } from "@/lib/supabase/server";

export type SyncLogRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  scores_fetched: number | null;
  scores_new: number | null;
  error_message: string | null;
};

export async function getRecentSyncLogs(
  limit = 30,
): Promise<SyncLogRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sync_logs")
    .select(
      "id, started_at, finished_at, status, scores_fetched, scores_new, error_message",
    )
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
