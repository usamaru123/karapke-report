"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateSetlistMetaPatch } from "@/lib/validation/setlists";

export async function createSetlist(input: {
  name: string;
  scheduledFor?: string;
  /**
   * When provided, copy all items from the given template into the new
   * setlist. The new row gets `template_source_id` set for traceability;
   * it is itself NOT a template (`is_template=false`).
   */
  fromTemplateId?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: created, error } = await supabase
    .from("setlists")
    .insert({
      user_id: user.id,
      name: input.name,
      scheduled_for: input.scheduledFor,
      template_source_id: input.fromTemplateId ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  if (input.fromTemplateId) {
    // Verify the template belongs to the caller + is actually a template.
    const { data: tpl } = await supabase
      .from("setlists")
      .select("id, is_template, user_id")
      .eq("id", input.fromTemplateId)
      .maybeSingle();
    if (tpl && tpl.is_template && tpl.user_id === user.id) {
      const { data: items } = await supabase
        .from("setlist_items")
        .select("song_id, position, key_override, note")
        .eq("setlist_id", input.fromTemplateId)
        .order("position", { ascending: true });
      if (items && items.length > 0) {
        const clones = items.map((it, i) => ({
          setlist_id: created.id,
          user_id: user.id,
          song_id: it.song_id,
          // Repack positions 0..N-1 defensively in case the template had gaps.
          position: i,
          key_override: it.key_override,
          note: it.note,
        }));
        const { error: cloneErr } = await supabase
          .from("setlist_items")
          .insert(clones);
        if (cloneErr) throw cloneErr;
      }
    }
  }

  revalidatePath("/setlists");
  return created;
}

/**
 * Toggle a setlist's `is_template` flag. Flipping TRUE hides it from the
 * main /setlists list and surfaces it under the "テンプレート" section /
 * dropdown. Flipping FALSE turns a template back into a regular setlist.
 */
export async function toggleSetlistTemplate(
  setlistId: string,
  isTemplate: boolean,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("setlists")
    .update({ is_template: isTemplate })
    .eq("id", setlistId);
  if (error) throw error;
  revalidatePath("/setlists");
  revalidatePath(`/setlists/${setlistId}`);
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

export async function updateSetlistMeta(
  setlistId: string,
  input: { name?: string; scheduledFor?: string | null },
): Promise<void> {
  const patch = validateSetlistMetaPatch(input);
  if (Object.keys(patch).length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("setlists")
    .update(patch)
    .eq("id", setlistId);
  if (error) throw error;

  revalidatePath(`/setlists/${setlistId}`);
  revalidatePath("/setlists");
}

/**
 * Randomly fills a setlist with songs from the user's repertoire that aren't
 * already on it. Options let the caller restrict the candidate pool to
 * certain confidence buckets (e.g. 得意 だけ) so the feature stays useful
 * without randomly picking 封印 songs.
 *
 * Returns the number of rows actually inserted. Silent when fewer eligible
 * repertoire entries exist than `count` — the caller can surface the delta.
 */
export async function randomFillSetlist(
  setlistId: string,
  count: number,
  opts?: {
    /** Confidence buckets to include. Defaults to the main three. */
    confidences?: Array<
      "unset" | "wanna_sing" | "practicing" | "normal" | "confident" | "shelf"
    >;
  },
): Promise<{ added: number; skipped: number }> {
  if (!Number.isInteger(count) || count <= 0 || count > 50) {
    throw new Error("count must be 1..50");
  }
  const allowedConfidences = opts?.confidences ?? [
    "wanna_sing",
    "practicing",
    "normal",
    "confident",
  ];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Candidate pool: repertoire rows matching the confidence filter.
  const { data: rep, error: repErr } = await supabase
    .from("repertoire")
    .select("song_id, confidence")
    .in("confidence", allowedConfidences);
  if (repErr) throw repErr;
  const candidateSongIds = (rep ?? []).map((r) => r.song_id);
  if (candidateSongIds.length === 0) {
    return { added: 0, skipped: count };
  }

  // Subtract songs already on this setlist.
  const { data: existing, error: exErr } = await supabase
    .from("setlist_items")
    .select("song_id")
    .eq("setlist_id", setlistId);
  if (exErr) throw exErr;
  const existingSongIds = new Set(
    (existing ?? []).map((r) => r.song_id),
  );
  const pool = candidateSongIds.filter((id) => !existingSongIds.has(id));

  if (pool.length === 0) {
    return { added: 0, skipped: count };
  }

  // Fisher-Yates to pick up to `count` unique songs.
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const picks = shuffled.slice(0, Math.min(count, shuffled.length));

  // Determine starting position — append after the current tail.
  const { data: tail } = await supabase
    .from("setlist_items")
    .select("position")
    .eq("setlist_id", setlistId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = tail ? (tail as { position: number }).position + 1 : 0;

  const rows = picks.map((song_id, i) => ({
    setlist_id: setlistId,
    user_id: user.id,
    song_id,
    position: nextPos + i,
  }));
  const { error: insErr } = await supabase.from("setlist_items").insert(rows);
  if (insErr) throw insErr;

  revalidatePath(`/setlists/${setlistId}`);
  return { added: picks.length, skipped: count - picks.length };
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
