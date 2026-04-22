"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ForgotState = { ok: true } | { error: string } | null;

// Start a password reset: Supabase sends a magic link pointing at
// /auth/callback?code=...&next=/reset which will exchange the PKCE code for
// a session and then land the user on /reset to pick a new password.
//
// We intentionally return `{ ok: true }` even on error to avoid leaking which
// email addresses are registered (account-enumeration defence). Real errors
// are logged server-side only.
export async function requestPasswordReset(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.includes("@")) {
    return { error: "メールアドレスの形式が正しくありません" };
  }

  const hdrs = await headers();
  // Prefer the forwarded host when behind Vercel/other proxies, fall back to
  // the direct Host header for local dev.
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  if (!host) return { error: "ホストを特定できませんでした" };
  const origin = `${proto}://${host}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset`,
  });
  if (error) {
    // Log but do not surface to the client to prevent account enumeration.
    console.error("resetPasswordForEmail failed:", error.message);
  }

  return { ok: true };
}
