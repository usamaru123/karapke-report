import { createClient } from "@/lib/supabase/server";

/**
 * Load the caller's current advice votes as a Map<ruleId, vote>. RLS scopes
 * rows to auth.uid(). Returns an empty map if the table is missing (old DB
 * without migration 005 applied) — the calling UI treats "no votes yet" the
 * same as "haven't voted".
 */
export async function getMyAdviceVotes(): Promise<Map<string, 1 | -1>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("advice_feedback")
    .select("rule_id, vote");
  if (error) {
    return new Map();
  }
  const map = new Map<string, 1 | -1>();
  for (const row of data ?? []) {
    const v = row.vote === 1 ? 1 : row.vote === -1 ? -1 : null;
    if (v !== null) map.set(row.rule_id, v);
  }
  return map;
}
