"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SyncResult = { fetched: number; new: number };

export async function triggerSync(): Promise<SyncResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase.functions.invoke("sync-scores", {
    body: { userId: user.id },
  });
  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/repertoire");
  return data as SyncResult;
}
