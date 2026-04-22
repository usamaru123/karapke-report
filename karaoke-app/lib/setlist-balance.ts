/**
 * Heuristics that flag potential problems in a setlist ordering.
 *
 * Current signals (data we already have; no external metadata required):
 *  1. High-note run   — 3+ consecutive songs whose `vocal_range_highest`
 *                       exceeds the singer's observed high by ≥ 1 semitone
 *  2. Low-energy run  — 3+ consecutive songs in the lower 40 % of the
 *                       singer's range (rough proxy for "ballad-y")
 *  3. Hard-to-sing    — any song flagged `hard` by evaluateVocalRange, so
 *                       the user sees them surfaced on one line
 *
 * BPM-based warnings need an external metadata source (JASRAC / Gracenote);
 * parked under RESEARCH-EXTERNAL-METADATA. When that lands, add a 4th rule
 * "fast-song-pileup" here.
 */

import { evaluateVocalRange } from "@/lib/vocal-range";
import type { Song } from "@/types/domain";

export type BalanceWarning = {
  id: string;
  level: "warn" | "info";
  title: string;
  /** Optional body text describing which positions are involved. */
  detail: string;
};

type ItemForBalance = {
  position: number;
  song: Pick<
    Song,
    "id" | "title" | "vocal_range_lowest" | "vocal_range_highest"
  > | null;
};

type UserRange = { low: number | null; high: number | null };

const HIGH_RUN_MIN = 3;
const LOW_RUN_MIN = 3;

export function analyzeSetlistBalance(
  items: ItemForBalance[],
  userRange: UserRange,
): BalanceWarning[] {
  const out: BalanceWarning[] = [];
  if (items.length === 0) return out;

  // --- 1. Songs flagged `hard` by range verdict -----------------------------
  const hardTitles: string[] = [];
  for (const it of items) {
    if (!it.song) continue;
    const verdict = evaluateVocalRange(
      {
        low: it.song.vocal_range_lowest,
        high: it.song.vocal_range_highest,
      },
      userRange,
    );
    if (verdict.kind === "hard") {
      hardTitles.push(`${it.position}. ${it.song.title}`);
    }
  }
  if (hardTitles.length > 0) {
    out.push({
      id: "hard_songs",
      level: "warn",
      title: `声域外の曲が ${hardTitles.length} 曲`,
      detail: hardTitles.join(" / "),
    });
  }

  // --- 2. High-note runs ----------------------------------------------------
  // Only meaningful when we know the user's high note.
  if (userRange.high !== null) {
    let runStart = -1;
    let runLen = 0;
    for (let i = 0; i < items.length; i++) {
      const s = items[i].song;
      const high = s?.vocal_range_highest ?? null;
      const isHigh = high !== null && high >= userRange.high + 1;
      if (isHigh) {
        if (runLen === 0) runStart = items[i].position;
        runLen++;
        if (runLen === HIGH_RUN_MIN) {
          // flag on first trigger; don't keep extending
          out.push({
            id: `high_run_${runStart}`,
            level: "warn",
            title: `高音の曲が ${HIGH_RUN_MIN} 曲連続 (${runStart} 曲目〜)`,
            detail:
              "ハイトーン連続は喉の疲労が早まります。間にミドルレンジの曲を挟むと安定します。",
          });
        }
      } else {
        runLen = 0;
        runStart = -1;
      }
    }
  }

  // --- 3. Low-energy runs ("バラード連続") ----------------------------------
  // Proxy: song's highest is in the lower 40 % of the user's own range.
  if (userRange.low !== null && userRange.high !== null) {
    const threshold =
      userRange.low + (userRange.high - userRange.low) * 0.4;
    let runStart = -1;
    let runLen = 0;
    for (let i = 0; i < items.length; i++) {
      const s = items[i].song;
      const high = s?.vocal_range_highest ?? null;
      const isLow = high !== null && high <= threshold;
      if (isLow) {
        if (runLen === 0) runStart = items[i].position;
        runLen++;
        if (runLen === LOW_RUN_MIN) {
          out.push({
            id: `low_run_${runStart}`,
            level: "info",
            title: `低音寄りの曲が ${LOW_RUN_MIN} 曲連続 (${runStart} 曲目〜)`,
            detail:
              "バラード系が続くと盛り上がりが鈍ることがあります。アップテンポを挟む案もあり。",
          });
        }
      } else {
        runLen = 0;
        runStart = -1;
      }
    }
  }

  return out;
}
