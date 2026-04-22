import { describe, expect, it } from "vitest";
import { evaluatePitchSweetSpot } from "@/lib/advice/rules/pitch-sweet-spot";
import { buildScore } from "./_helpers";

describe("R03 evaluatePitchSweetSpot", () => {
  it("warns when pitch >= 95 (ボーナス減衰リスク)", () => {
    const r = evaluatePitchSweetSpot(buildScore({ pitch_score: 97 }));
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R03.too_precise");
    expect(r[0].severity).toBe("warn");
    expect(r[0].confidence).toBe("low");
  });

  it("tips when pitch < 85", () => {
    const r = evaluatePitchSweetSpot(buildScore({ pitch_score: 80 }));
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R03.pitch_room");
    expect(r[0].severity).toBe("tip");
  });

  it("silent in the sweet 85..95 band", () => {
    expect(evaluatePitchSweetSpot(buildScore({ pitch_score: 85 }))).toEqual([]);
    expect(evaluatePitchSweetSpot(buildScore({ pitch_score: 90 }))).toEqual([]);
    expect(evaluatePitchSweetSpot(buildScore({ pitch_score: 94 }))).toEqual([]);
  });

  it("returns [] when pitch_score null", () => {
    expect(
      evaluatePitchSweetSpot(buildScore({ pitch_score: null })),
    ).toEqual([]);
  });

  it("carries the inferred/low confidence hint in the message", () => {
    const r = evaluatePitchSweetSpot(buildScore({ pitch_score: 96 }));
    expect(r[0].message).toContain("推定");
    expect(r[0].source).toBe("inferred");
  });
});
