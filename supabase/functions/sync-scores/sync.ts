/**
 * Orchestrator: fetch DAM → parse → group into sessions → persist.
 * Mirrors poc/karaoke-sync-poc/src/sync.py at a high level.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { DamClient } from "./dam_client.ts";
import { parseScoringElement } from "./parser.ts";
import { groupIntoSessions } from "./session_boundary.ts";
import { closeSyncLog, openSyncLog, persistGroups } from "./db.ts";

export type SyncResult = {
  fetched: number;
  parsed: number;
  parse_failed: number;
  new: number;
  skipped: number;
  sessions_created: number;
  dry_run: boolean;
};

export type SyncOptions = {
  dryRun?: boolean;
  sessionGapHours?: number;
  maxPages?: number;
};

export async function runSync(
  supa: SupabaseClient,
  userId: string,
  cdmCardNo: string,
  opts: SyncOptions = {},
): Promise<SyncResult> {
  const { dryRun = false, sessionGapHours = 3, maxPages = 50 } = opts;

  const logId = dryRun ? null : await openSyncLog(supa, userId);

  const client = new DamClient(cdmCardNo);

  const parsed: ReturnType<typeof parseScoringElement>[] = [];
  let fetched = 0;
  let parseFailed = 0;

  try {
    for await (const rec of client.iterAll(maxPages)) {
      fetched++;
      try {
        parsed.push(parseScoringElement(rec.element));
      } catch (e) {
        parseFailed++;
        console.error(
          JSON.stringify({
            level: "error",
            msg: "parse_failed",
            scoring_ai_id: rec.scoring_ai_id,
            error: e instanceof Error ? e.message : String(e),
          }),
        );
      }
    }

    if (dryRun) {
      return {
        fetched,
        parsed: parsed.length,
        parse_failed: parseFailed,
        new: 0,
        skipped: 0,
        sessions_created: 0,
        dry_run: true,
      };
    }

    const groups = groupIntoSessions(parsed, sessionGapHours);
    const persisted = await persistGroups(supa, userId, groups);

    if (logId) {
      const status =
        parseFailed === 0 ? "success" : parseFailed === fetched ? "failed" : "partial";
      await closeSyncLog(supa, logId, status, {
        scores_fetched: fetched,
        scores_new: persisted.new_scores,
      });
    }

    return {
      fetched,
      parsed: parsed.length,
      parse_failed: parseFailed,
      new: persisted.new_scores,
      skipped: persisted.skipped_scores,
      sessions_created: persisted.sessions_created,
      dry_run: false,
    };
  } catch (e) {
    if (logId) {
      await closeSyncLog(supa, logId, "failed", {
        scores_fetched: fetched,
        scores_new: 0,
        error_message: e instanceof Error ? e.message : String(e),
      }).catch(() => {/* swallow */});
    }
    throw e;
  }
}
