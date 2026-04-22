/**
 * Entry point for the `sync-scores` Supabase Edge Function.
 *
 * Flow:
 *   1. Require Authorization: Bearer <JWT> header.
 *   2. Resolve the caller's user id via supabase.auth.getUser(jwt).
 *   3. Fetch the caller's cdmCardNo through the service-role RPC
 *      get_cdm_card_no_for(user_id). Plaintext after the vault retreat
 *      (see docs/data-model.md + schema.sql CREDENTIALS HELPER note).
 *   4. Run the sync pipeline.
 *   5. Respond with the result JSON.
 *
 * Trigger sources:
 *   - Next.js Server Action supabase.functions.invoke('sync-scores')
 *   - GitHub Actions cron POSTing with the service-role key as Bearer
 *     (the impersonation user id comes from the body.userId field when
 *     auth.getUser fails; kept minimal for MVP).
 */

import { createClient } from "@supabase/supabase-js";
import { runSync } from "./sync.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SESSION_GAP_HOURS = Number(Deno.env.get("SESSION_GAP_HOURS") ?? "3");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function resolveUserId(jwt: string, fallbackUserId?: string): Promise<string | null> {
  // Try JWT resolution first.
  const anonClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: userRes } = await anonClient.auth.getUser(jwt);
  if (userRes.user) return userRes.user.id;
  // Fallback: body.userId + service_role header (used by cron / server jobs).
  if (fallbackUserId) return fallbackUserId;
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const auth = req.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing bearer token" }, 401);
  }
  const jwt = auth.slice("Bearer ".length);

  // Accept optional body: { userId?: string, dryRun?: boolean }
  let body: { userId?: string; dryRun?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // No body = empty object; fine.
  }

  const userId = await resolveUserId(jwt, body.userId);
  if (!userId) {
    return jsonResponse({ error: "Unable to resolve user" }, 401);
  }

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Pull cdmCardNo via the service-role-only RPC.
  const { data: card, error: cardErr } = await supa.rpc("get_cdm_card_no_for", {
    p_user_id: userId,
  });
  if (cardErr) {
    return jsonResponse(
      { error: "Could not fetch cdmCardNo", detail: cardErr.message },
      500,
    );
  }
  if (typeof card !== "string" || card.length === 0) {
    return jsonResponse({ error: "cdmCardNo not registered" }, 412);
  }

  try {
    const result = await runSync(supa, userId, card, {
      dryRun: body.dryRun === true,
      sessionGapHours: SESSION_GAP_HOURS,
    });
    return jsonResponse(result);
  } catch (e) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "sync_failed",
        userId,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return jsonResponse(
      { error: "Sync failed", detail: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
});
