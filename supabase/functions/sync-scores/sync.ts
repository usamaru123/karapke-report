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
  /** True when incremental early-exit kicked in (≥1 known id hit). */
  stopped_early: boolean;
};

export type SyncOptions = {
  dryRun?: boolean;
  sessionGapHours?: number;
  maxPages?: number;
  /**
   * Incremental mode: pre-fetch the user's known `dam_scoring_id` set and
   * stop iterating DAM as soon as we encounter one. DAM returns records
   * newest-first, so the first match means everything further back is
   * already in the DB. Defaults to true; pass false for a full re-scan
   * (e.g., after suspicious data corruption).
   */
  incremental?: boolean;
  /**
   * With incremental mode, require this many consecutive known-ID hits
   * before stopping. Defensive against rare DAM reordering. Defaults to 1
   * (fast path); bump to 3 if reordering is observed in the wild.
   */
  incrementalStopAfter?: number;
};

export async function runSync(
  supa: SupabaseClient,
  userId: string,
  cdmCardNo: string,
  opts: SyncOptions = {},
): Promise<SyncResult> {
  const {
    dryRun = false,
    sessionGapHours = 3,
    maxPages = 50,
    incremental = true,
    incrementalStopAfter = 1,
  } = opts;

  // Pre-fetch the known scoring_ai_id set so the loop can break as soon as we
  // overlap with history. A single SELECT of up to ~200 short strings is
  // cheap; the win is avoiding 39 more DAM page fetches (~1.5s each).
  let knownIds = new Set<string>();
  if (incremental && !dryRun) {
    const { data: existing, error } = await supa
      .from("scores")
      .select("dam_scoring_id")
      .eq("user_id", userId);
    if (error) {
      console.warn(
        JSON.stringify({
          level: "warn",
          msg: "incremental_prefetch_failed_falling_back",
          error: error.message,
        }),
      );
    } else {
      knownIds = new Set(
        (existing ?? []).map((r: { dam_scoring_id: string }) => r.dam_scoring_id),
      );
    }
  }

  const logId = dryRun ? null : await openSyncLog(supa, userId);

  const client = new DamClient(cdmCardNo);

  const parsed: ReturnType<typeof parseScoringElement>[] = [];
  let fetched = 0;
  let parseFailed = 0;
  let stoppedEarly = false;
  let consecutiveKnown = 0;

  try {
    for await (const rec of client.iterAll(maxPages)) {
      fetched++;
      if (knownIds.has(rec.scoring_ai_id)) {
        consecutiveKnown++;
        if (consecutiveKnown >= incrementalStopAfter) {
          stoppedEarly = true;
          break;
        }
        continue; // skip parsing, move to next record
      }
      consecutiveKnown = 0;
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
        stopped_early: stoppedEarly,
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
      stopped_early: stoppedEarly,
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
