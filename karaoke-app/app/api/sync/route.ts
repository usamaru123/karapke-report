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

  try {
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
  } catch (e) {
    // supabase-js invoke() can throw FunctionsHttpError/FetchError instead of
    // returning { error }, so we have to catch explicitly.
    let detail: string;
    let upstreamStatus: number | undefined;
    // supabase-js FunctionsHttpError attaches a `context` with a Response.
    const ctx = (
      e as { context?: { status?: number; text?: () => Promise<string> } }
    )?.context;
    if (ctx?.status !== undefined) {
      upstreamStatus = ctx.status;
      try {
        detail = ctx.text ? await ctx.text() : String(e);
      } catch {
        detail = e instanceof Error ? e.message : String(e);
      }
    } else {
      detail = e instanceof Error ? e.message : String(e);
    }
    return NextResponse.json(
      {
        error: "sync invocation failed",
        detail,
        upstreamStatus,
      },
      { status: 502 },
    );
  }
}
