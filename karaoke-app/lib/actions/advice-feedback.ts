"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AdviceVote = 1 | -1;

/**
 * Cast / change the current user's thumbs vote on an advice rule. Upserts on
 * (user_id, rule_id) so re-voting overwrites the previous sign. Revalidates
 * repertoire detail routes since those show the advice list.
 */
export async function setAdviceVote(
  ruleId: string,
  vote: AdviceVote,
): Promise<void> {
  if (vote !== 1 && vote !== -1) {
    throw new Error("vote must be +1 or -1");
  }
  if (!ruleId || ruleId.length > 128) {
    throw new Error("invalid ruleId");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("advice_feedback")
    .upsert(
      {
        user_id: user.id,
        rule_id: ruleId,
        vote,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,rule_id" },
    );
  if (error) throw error;

  // Only the repertoire / score detail routes render advice. We refresh both.
  revalidatePath("/repertoire", "layout");
  revalidatePath("/scores", "layout");
}

/** Clear the current user's vote on a rule. No-op if absent. */
export async function clearAdviceVote(ruleId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("advice_feedback")
    .delete()
    .eq("user_id", user.id)
    .eq("rule_id", ruleId);
  if (error) throw error;
  revalidatePath("/repertoire", "layout");
  revalidatePath("/scores", "layout");
}
