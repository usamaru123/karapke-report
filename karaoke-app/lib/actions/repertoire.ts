"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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
    const { data: newSong, error } = await supabase
      .from("songs")
      .upsert(
        {
          title: data.manualTitle,
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

  const { error: repErr } = await supabase
    .from("repertoire")
    .insert({ user_id: user.id, song_id: songId });
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
    confidence?: "practicing" | "normal" | "confident";
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

export async function removeFromRepertoire(repertoireId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("repertoire")
    .delete()
    .eq("id", repertoireId);
  if (error) throw error;
  revalidatePath("/repertoire");
}
