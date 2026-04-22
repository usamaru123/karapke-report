"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { stripVersionMarkers } from "@/lib/song-title";
import { createClient } from "@/lib/supabase/server";

const AddSongSchema = z
  .object({
    songId: z.string().uuid().optional(),
    manualTitle: z.string().optional(),
    manualArtist: z.string().optional(),
    manualRequestNo: z.string().optional(),
  })
  .refine(
    (d) => Boolean(d.songId) || (d.manualTitle && d.manualArtist),
    { message: "songId か manualTitle + manualArtist が必要です" },
  );

export async function addToRepertoire(input: z.infer<typeof AddSongSchema>) {
  const data = AddSongSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  let songId = data.songId;

  if (!songId && data.manualTitle && data.manualArtist) {
    // Strip DAM-style version markers so "ビンテージ (プロオケ)" and "ビンテージ"
    // collapse onto the same song row. See lib/song-title.ts.
    const cleanedTitle = stripVersionMarkers(data.manualTitle);
    const { data: newSong, error } = await supabase
      .from("songs")
      .upsert(
        {
          title: cleanedTitle,
          artist: data.manualArtist,
          request_no: data.manualRequestNo,
        },
        { onConflict: "title_normalized,artist_normalized" },
      )
      .select()
      .single();
    if (error) throw error;
    songId = newSong.id;
  }
  if (!songId) throw new Error("songId or manual info required");

  // Manually-added rows start as 'unset' so they appear under the "未設定"
  // filter chip until the user tags them. Explicit even though the DB
  // default is also 'unset' — keeps the intent readable at the call site.
  const { error: repErr } = await supabase
    .from("repertoire")
    .insert({ user_id: user.id, song_id: songId, confidence: "unset" });
  if (repErr) {
    if (repErr.code === "23505") throw new Error("すでに登録済みです");
    throw repErr;
  }
  revalidatePath("/repertoire");
}

export async function updateRepertoireMeta(
  repertoireId: string,
  patch: {
    preferred_key?: number;
    confidence?:
      | "unset"
      | "wanna_sing"
      | "practicing"
      | "normal"
      | "confident"
      | "shelf";
    tags?: string[];
    memo?: string | null;
    is_favorite?: boolean;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("repertoire")
    .update(patch)
    .eq("id", repertoireId);
  if (error) throw error;
  revalidatePath("/repertoire");
  revalidatePath(`/repertoire/${repertoireId}`);
}

/**
 * One-shot setter for a repertoire row's confidence. Lightweight wrapper
 * for the quick-pick dropdown on RepertoireCard — avoids re-validating the
 * full meta patch shape.
 */
export async function setRepertoireConfidence(
  repertoireId: string,
  confidence:
    | "unset"
    | "wanna_sing"
    | "practicing"
    | "normal"
    | "confident"
    | "shelf",
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("repertoire")
    .update({ confidence })
    .eq("id", repertoireId);
  if (error) throw error;
  revalidatePath("/repertoire");
  revalidatePath(`/repertoire/${repertoireId}`);
}

export async function removeFromRepertoire(repertoireId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("repertoire")
    .delete()
    .eq("id", repertoireId);
  if (error) throw error;
  revalidatePath("/repertoire");
}
