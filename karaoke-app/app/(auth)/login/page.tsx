import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

// Server Component. If the visitor is already signed in, bounce them to the
// dashboard — this replaces the /login-specific redirect that previously
// lived in the middleware/proxy layer. See (app)/layout.tsx for the
// opposite direction (unauthed → /login).
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const sp = await searchParams;
  const notice =
    sp.reset === "1"
      ? "パスワードを更新しました。新しいパスワードでサインインしてください。"
      : null;
  const error = sp.error ?? null;

  return <LoginForm notice={notice} error={error} />;
}
