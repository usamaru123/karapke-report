"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createSetlist(input: {
  name: string;
  scheduledFor?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("setlists")
    .insert({
      user_id: user.id,
      name: input.name,
      scheduled_for: input.scheduledFor,
    })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/setlists");
  return data;
}

export async function addItemToSetlist(setlistId: string, songId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: existing } = await supabase
    .from("setlist_items")
    .select("position")
    .eq("setlist_id", setlistId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPos = existing ? existing.position + 1 : 0;

  const { error } = await supabase.from("setlist_items").insert({
    setlist_id: setlistId,
    user_id: user.id,
    song_id: songId,
    position: nextPos,
  });
  if (error) throw error;
  revalidatePath(`/setlists/${setlistId}`);
}

// NOTE: Not transactional — runs 2N UPDATEs. For MVP. A proper fix is a
// Postgres RPC that does the reorder in a single transaction.
export async function reorderSetlistItems(
  setlistId: string,
  orderedItemIds: string[],
) {
  const supabase = await createClient();
  const OFFSET = 1_000_000;
  for (let i = 0; i < orderedItemIds.length; i++) {
    const { error } = await supabase
      .from("setlist_items")
      .update({ position: OFFSET + i })
      .eq("id", orderedItemIds[i]);
    if (error) throw error;
  }
  for (let i = 0; i < orderedItemIds.length; i++) {
    const { error } = await supabase
      .from("setlist_items")
      .update({ position: i })
      .eq("id", orderedItemIds[i]);
    if (error) throw error;
  }
  revalidatePath(`/setlists/${setlistId}`);
}

export async function deleteSetlistItem(itemId: string, setlistId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("setlist_items")
    .delete()
    .eq("id", itemId);
  if (error) throw error;
  revalidatePath(`/setlists/${setlistId}`);
}

export async function togglePinSetlist(setlistId: string, pinned: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("setlists")
    .update({ is_pinned: pinned })
    .eq("id", setlistId);
  if (error) throw error;
  revalidatePath("/setlists");
}

export async function deleteSetlist(setlistId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("setlists")
    .delete()
    .eq("id", setlistId);
  if (error) throw error;
  revalidatePath("/setlists");
}
