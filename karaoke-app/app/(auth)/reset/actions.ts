"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ResetState = { error: string } | null;

export async function updatePassword(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const password = formData.get("password");
  const confirm = formData.get("confirm");

  if (typeof password !== "string" || typeof confirm !== "string") {
    return { error: "フォーム入力が不正です" };
  }
  if (password.length < 8) {
    return { error: "パスワードは 8 文字以上にしてください" };
  }
  if (password !== confirm) {
    return { error: "パスワードが一致しません" };
  }

  const supabase = await createClient();
  // The PKCE callback already exchanged the code for a session cookie, so
  // updateUser() runs as the authenticated user here.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "再設定セッションが見つかりません。リンクを再取得してください。" };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  // Sign out so the user logs in fresh with the new password — avoids a
  // half-authenticated state if they share the device.
  await supabase.auth.signOut();
  redirect("/login?reset=1");
}
