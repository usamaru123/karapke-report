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

export async function getSetlists(): Promise<SetlistWithItems[]> {
  const supabase = await createClient();
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
