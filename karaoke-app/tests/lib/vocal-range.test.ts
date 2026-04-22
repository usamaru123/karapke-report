import { describe, expect, it } from "vitest";
import { evaluateVocalRange } from "@/lib/vocal-range";

describe("evaluateVocalRange", () => {
  it("returns unknown/missing_song when the song has no low/high", () => {
    const v = evaluateVocalRange(
      { low: null, high: 72 },
      { low: 48, high: 72 },
    );
    expect(v).toEqual({ kind: "unknown", reason: "missing_song" });
  });

  it("returns unknown/missing_song when song.high <= song.low", () => {
    const v = evaluateVocalRange(
      { low: 60, high: 60 },
      { low: 48, high: 72 },
    );
    expect(v).toEqual({ kind: "unknown", reason: "missing_song" });
  });

  it("returns unknown/missing_user when user has no range", () => {
    const v = evaluateVocalRange(
      { low: 48, high: 72 },
      { low: null, high: null },
    );
    expect(v).toEqual({ kind: "unknown", reason: "missing_user" });
  });

  it("classifies 'fits' when both ends have >= 2 semitones of headroom", () => {
    // user 46..74, song 48..72 → low margin 2, high margin 2 → fits
    const v = evaluateVocalRange(
      { low: 48, high: 72 },
      { low: 46, high: 74 },
    );
    expect(v).toMatchObject({ kind: "fits", lowMargin: 2, highMargin: 2 });
  });

  it("classifies 'key_tweak' when headroom shrinks but stays above -3", () => {
    // user 48..72, song 48..72 → margins 0 both → key_tweak (< FITS_MARGIN=2,
    // >= TWEAKABLE_FLOOR=-3). reason = too_low (low-breach rule when no high breach)
    const v = evaluateVocalRange(
      { low: 48, high: 72 },
      { low: 48, high: 72 },
    );
    expect(v.kind).toBe("key_tweak");
  });

  it("classifies 'key_tweak' with too_high reason when song exceeds user high within -3", () => {
    // user 48..72, song 48..74 → highMargin = -2 (within tweakable range)
    const v = evaluateVocalRange(
      { low: 48, high: 74 },
      { low: 48, high: 72 },
    );
    expect(v).toMatchObject({ kind: "key_tweak", reason: "too_high" });
  });

  it("classifies 'hard' when the worst margin is below -3", () => {
    // user 48..72, song 48..80 → highMargin = -8 → hard/too_high
    const v = evaluateVocalRange(
      { low: 48, high: 80 },
      { low: 48, high: 72 },
    );
    expect(v).toMatchObject({ kind: "hard", reason: "too_high" });
  });

  it("classifies 'both' reason when both ends breach the user range", () => {
    // user 50..70, song 40..80 → low -10, high -10 → hard/both
    const v = evaluateVocalRange(
      { low: 40, high: 80 },
      { low: 50, high: 70 },
    );
    expect(v).toMatchObject({ kind: "hard", reason: "both" });
  });
});
