"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  validateCdmCardNo,
  validateDisplayName,
} from "@/lib/validation/profile";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function setDisplayName(displayName: string): Promise<void> {
  const trimmed = validateDisplayName(displayName);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // profiles.display_name is writable by the owning user under RLS
  // (see sql/schema.sql policies). No RPC needed.
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: trimmed })
    .eq("id", user.id);
  if (error) throw error;

  revalidatePath("/settings");
  revalidatePath("/");
}

export async function setCdmCardNo(cardNo: string): Promise<void> {
  const trimmed = validateCdmCardNo(cardNo);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.rpc("set_my_cdm_card_no", {
    p_card_no: trimmed,
  });
  if (error) throw error;

  revalidatePath("/settings");
  revalidatePath("/");
}
