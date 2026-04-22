"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function setCdmCardNo(cardNo: string): Promise<void> {
  const trimmed = cardNo.trim();
  if (trimmed.length < 10 || trimmed.length > 64) {
    throw new Error("カード番号の形式が正しくありません (10-64 文字)");
  }

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
