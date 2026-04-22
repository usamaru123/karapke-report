import { describe, expect, it } from "vitest";
import {
  formatKeyDelta,
  recommendKey,
} from "@/lib/key-recommendation";

describe("recommendKey", () => {
  it("returns no_scores when the input is empty", () => {
    expect(recommendKey([])).toEqual({
      kind: "none",
      reason: "no_scores",
      stats: [],
    });
  });

  it("returns insufficient_samples when no key has 2+ samples", () => {
    const r = recommendKey([
      { key_control: 0, total_score: 90 },
      { key_control: 2, total_score: 88 },
    ]);
    expect(r.kind).toBe("none");
    if (r.kind === "none") {
      expect(r.reason).toBe("insufficient_samples");
      // The per-key breakdown should still be returned so the UI can
      // display "what the user has tried".
      expect(r.stats.length).toBe(2);
    }
  });

  it("picks the key with the highest avg among qualified keys", () => {
    const r = recommendKey([
      // key 0: 90, 92 → avg 91
      { key_control: 0, total_score: 90 },
      { key_control: 0, total_score: 92 },
      // key -2: 85, 87 → avg 86
      { key_control: -2, total_score: 85 },
      { key_control: -2, total_score: 87 },
    ]);
    expect(r.kind).toBe("recommended");
    if (r.kind === "recommended") {
      expect(r.bestKey).toBe(0);
      expect(r.best.avg).toBeCloseTo(91, 5);
    }
  });

  it("ignores single-sample keys when qualified keys exist", () => {
    const r = recommendKey([
      // key +5: one score of 99 — should NOT be picked despite higher avg
      { key_control: 5, total_score: 99 },
      // key 0: 88, 90 → qualified
      { key_control: 0, total_score: 88 },
      { key_control: 0, total_score: 90 },
    ]);
    expect(r.kind).toBe("recommended");
    if (r.kind === "recommended") {
      expect(r.bestKey).toBe(0);
    }
  });

  it("accepts string total_score (Supabase numeric comes back as string)", () => {
    const r = recommendKey([
      { key_control: 0, total_score: "90.5" },
      { key_control: 0, total_score: "91.5" },
    ]);
    expect(r.kind).toBe("recommended");
    if (r.kind === "recommended") {
      expect(r.best.avg).toBeCloseTo(91, 5);
    }
  });

  it("skips rows with null / non-numeric total_score", () => {
    const r = recommendKey([
      { key_control: 0, total_score: null },
      { key_control: 0, total_score: "n/a" },
      { key_control: 0, total_score: 90 },
      { key_control: 0, total_score: 92 },
    ]);
    expect(r.kind).toBe("recommended");
    if (r.kind === "recommended") {
      expect(r.best.count).toBe(2);
      expect(r.best.avg).toBeCloseTo(91, 5);
    }
  });

  it("breaks ties by best score then count", () => {
    // Two keys tied on avg; key 3 has higher best → should win.
    const r = recommendKey([
      { key_control: 0, total_score: 90 },
      { key_control: 0, total_score: 90 },
      { key_control: 3, total_score: 85 },
      { key_control: 3, total_score: 95 },
    ]);
    expect(r.kind).toBe("recommended");
    if (r.kind === "recommended") {
      expect(r.bestKey).toBe(3);
    }
  });
});

describe("formatKeyDelta", () => {
  it("returns '原キー' for 0", () => {
    expect(formatKeyDelta(0)).toBe("原キー");
  });

  it("prefixes positive values with +", () => {
    expect(formatKeyDelta(3)).toBe("+3");
  });

  it("keeps the native negative sign for negative values", () => {
    expect(formatKeyDelta(-2)).toBe("-2");
  });
});
