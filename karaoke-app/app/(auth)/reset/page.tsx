import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResetForm } from "./ResetForm";

// Reached after /auth/callback exchanges the PKCE code for a session. The
// magic-link user is briefly authenticated just long enough to pick a new
// password; updatePassword() signs them out again when done.
export default async function ResetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // No session means the link was stale, already consumed, or opened in a
    // different browser. Send them to /forgot to request a new one.
    redirect("/forgot");
  }

  return <ResetForm />;
}
