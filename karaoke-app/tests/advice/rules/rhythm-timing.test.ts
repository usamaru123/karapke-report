import { describe, expect, it } from "vitest";
import { evaluateRhythmTiming } from "@/lib/advice/rules/rhythm-timing";
import { buildScore } from "./_helpers";

describe("R06 evaluateRhythmTiming", () => {
  it("fires when rhythm < 90", () => {
    const r = evaluateRhythmTiming(buildScore({ rhythm_score: 85 }));
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R06.rushed_suspect");
    expect(r[0].severity).toBe("tip");
    expect(r[0].message).toContain("タメ");
  });

  it("does NOT fire at exactly 90", () => {
    expect(evaluateRhythmTiming(buildScore({ rhythm_score: 90 }))).toEqual([]);
  });

  it("does NOT fire at 95", () => {
    expect(evaluateRhythmTiming(buildScore({ rhythm_score: 95 }))).toEqual([]);
  });

  it("returns [] when rhythm_score is null", () => {
    expect(evaluateRhythmTiming(buildScore({ rhythm_score: null }))).toEqual([]);
  });
});
