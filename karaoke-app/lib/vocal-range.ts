/**
 * Vocal range compatibility between a song and the user's own observed range.
 *
 * Inputs are MIDI note numbers (e.g. C3=48, C4=60, C5=72). A "semitone of
 * margin" just means a difference of 1 MIDI unit.
 *
 * Threshold rationale (calibrate with real data in Phase 6+):
 *   - `fits`: both ends have >= 2 semitones of headroom
 *   - `key_tweak`: any end is within -3..+1 semitones of the singer's range
 *   - `hard`: an end is > 3 semitones outside the singer's range
 *
 * "key_tweak" is a hint that KEY control on the remocon can make the song
 * singable; the actual recommendation lives in the A3 recommender.
 */

export type VocalRangeVerdict =
  | { kind: "fits"; lowMargin: number; highMargin: number }
  | { kind: "key_tweak"; lowMargin: number; highMargin: number; reason: "too_high" | "too_low" | "both" }
  | { kind: "hard"; lowMargin: number; highMargin: number; reason: "too_high" | "too_low" | "both" }
  | { kind: "unknown"; reason: "missing_song" | "missing_user" };

export type SongRange = {
  low: number | null;
  high: number | null;
};

export type UserRange = {
  low: number | null;
  high: number | null;
};

const FITS_MARGIN = 2;
const TWEAKABLE_FLOOR = -3;

function classifyReason(
  lowMargin: number,
  highMargin: number,
): "too_high" | "too_low" | "both" {
  const lowBreach = lowMargin < 0;
  const highBreach = highMargin < 0;
  if (lowBreach && highBreach) return "both";
  if (highBreach) return "too_high";
  return "too_low";
}

export function evaluateVocalRange(
  song: SongRange,
  user: UserRange,
): VocalRangeVerdict {
  if (
    song.low === null ||
    song.high === null ||
    song.high <= song.low
  ) {
    return { kind: "unknown", reason: "missing_song" };
  }
  if (user.low === null || user.high === null || user.high <= user.low) {
    return { kind: "unknown", reason: "missing_user" };
  }

  // How much headroom the user has on each side. Negative means the song
  // extends past the user's current range.
  const lowMargin = song.low - user.low; // >=0 if song's low is at or above user's low
  const highMargin = user.high - song.high; // >=0 if user's high reaches song's high

  if (lowMargin >= FITS_MARGIN && highMargin >= FITS_MARGIN) {
    return { kind: "fits", lowMargin, highMargin };
  }

  const worst = Math.min(lowMargin, highMargin);
  if (worst >= TWEAKABLE_FLOOR) {
    return {
      kind: "key_tweak",
      lowMargin,
      highMargin,
      reason: classifyReason(lowMargin, highMargin),
    };
  }

  return {
    kind: "hard",
    lowMargin,
    highMargin,
    reason: classifyReason(lowMargin, highMargin),
  };
}
