import { createClient } from "@/lib/supabase/server";
import type { Setlist, SetlistItem, Song } from "@/types/domain";

export type SetlistItemWithSong = Pick<
  SetlistItem,
  "id" | "position" | "key_override"
> & {
  song: Pick<Song, "id" | "title" | "artist" | "duration_sec"> | null;
};

export type SetlistWithItems = Setlist & {
  items: SetlistItemWithSong[];
  totalDurationSec: number;
};

const DEFAULT_SONG_SECONDS = 240;

export async function getSetlists(opts?: {
  /** `false` excludes templates (default), `true` returns templates only. */
  templates?: boolean;
}): Promise<SetlistWithItems[]> {
  const supabase = await createClient();
  const wantTemplates = opts?.templates ?? false;
  const { data, error } = await supabase
    .from("setlists")
    .select(
      `
      *,
      items:setlist_items(
        id, position, key_override,
        song:songs(id, title, artist, duration_sec)
      )
    `,
    )
    .eq("is_template", wantTemplates)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as (Setlist & {
    items: SetlistItemWithSong[];
  })[];

  return rows.map((setlist) => {
    const sortedItems = [...setlist.items].sort(
      (a, b) => a.position - b.position,
    );
    const totalDurationSec = sortedItems.reduce(
      (sum, it) => sum + (it.song?.duration_sec ?? DEFAULT_SONG_SECONDS),
      0,
    );
    return { ...setlist, items: sortedItems, totalDurationSec };
  });
}

export type UpcomingSetlist = {
  id: string;
  name: string;
  scheduledFor: string;
  /** Whole days from today (server-local). Negative means past. */
  daysUntil: number;
  itemCount: number;
};

/**
 * Next upcoming scheduled setlist for the current user. Today counts as day 0.
 * Returns null when nothing is scheduled in the future. Templates excluded.
 */
export async function getNextScheduledSetlist(): Promise<UpcomingSetlist | null> {
  const supabase = await createClient();
  // Compare against today's date (00:00 UTC boundary is close enough for our
  // day-granularity UI; `scheduled_for` is stored as DATE).
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("setlists")
    .select("id, name, scheduled_for, setlist_items(count)")
    .eq("is_template", false)
    .not("scheduled_for", "is", null)
    .gte("scheduled_for", todayStr)
    .order("scheduled_for", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.scheduled_for) return null;

  const sched = new Date(`${data.scheduled_for}T00:00:00`);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysUntil = Math.round(
    (sched.getTime() - start.getTime()) / 86_400_000,
  );

  const itemCount = Array.isArray(data.setlist_items)
    ? (data.setlist_items[0]?.count ?? 0)
    : 0;

  return {
    id: data.id,
    name: data.name,
    scheduledFor: data.scheduled_for,
    daysUntil,
    itemCount,
  };
}

export type SetlistDetailItem = Pick<
  SetlistItem,
  "id" | "position" | "key_override" | "note"
> & {
  song: Song | null;
};

export type SetlistDetail = Setlist & { items: SetlistDetailItem[] };

export async function getSetlistDetail(
  setlistId: string,
): Promise<SetlistDetail> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("setlists")
    .select(
      `
      *,
      items:setlist_items(
        id, position, key_override, note,
        song:songs(*)
      )
    `,
    )
    .eq("id", setlistId)
    .single();

  if (error) throw error;
  const row = data as unknown as SetlistDetail;
  return {
    ...row,
    items: [...row.items].sort((a, b) => a.position - b.position),
  };
}
