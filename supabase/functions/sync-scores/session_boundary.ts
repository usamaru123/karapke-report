/**
 * Session boundary logic (Deno port of poc/karaoke-sync-poc/src/session_boundary.py).
 *
 * Rule (from docs/data-model.md):
 *   A new score joins the existing session if and only if the gap between
 *   sung_at and the previous score's sung_at is <= SESSION_GAP_HOURS. Otherwise
 *   a new session is created, anchored at sung_at.
 *
 * The PoC default gap is 3 hours. Edge runtime reads it from env SESSION_GAP_HOURS
 * with the same default.
 */

import type { ParsedScore } from "./parser.ts";

export type SessionGroup = {
  started_at: Date;
  ended_at: Date;
  scores: ParsedScore[];
};

export function groupIntoSessions(
  scores: ParsedScore[],
  gapHours: number = 3,
): SessionGroup[] {
  if (scores.length === 0) return [];
  const sorted = [...scores].sort(
    (a, b) => a.sung_at.getTime() - b.sung_at.getTime(),
  );
  const gapMs = gapHours * 60 * 60 * 1000;
  const groups: SessionGroup[] = [];
  let current: SessionGroup | null = null;
  for (const s of sorted) {
    if (!current) {
      current = { started_at: s.sung_at, ended_at: s.sung_at, scores: [s] };
      groups.push(current);
      continue;
    }
    const gap = s.sung_at.getTime() - current.ended_at.getTime();
    if (gap <= gapMs) {
      current.scores.push(s);
      current.ended_at = s.sung_at;
    } else {
      current = { started_at: s.sung_at, ended_at: s.sung_at, scores: [s] };
      groups.push(current);
    }
  }
  return groups;
}
