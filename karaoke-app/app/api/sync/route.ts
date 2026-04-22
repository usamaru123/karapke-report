import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Extend the Node function timeout to match the Edge Function's worst-case
// duration (~44s observed in P5-01). Vercel Hobby caps at 60s.
export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.functions.invoke("sync-scores", {
    body: { userId: user.id },
  });
  if (error) {
    return NextResponse.json(
      {
        error: "sync invocation failed",
        detail: error.message ?? String(error),
      },
      { status: 502 },
    );
  }
  return NextResponse.json(data);
}
