import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForgotForm } from "./ForgotForm";

export default async function ForgotPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return <ForgotForm />;
}
