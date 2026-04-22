import { describe, expect, it } from "vitest";
import {
  evaluateIntonationCeiling,
  predictedExpressionCeiling,
} from "@/lib/advice/rules/intonation-ceiling";
import { buildScore } from "./_helpers";

describe("predictedExpressionCeiling", () => {
  it("y = 0.25 * intonation + 78 for known pairs", () => {
    expect(predictedExpressionCeiling(80)).toBeCloseTo(98, 5);
    expect(predictedExpressionCeiling(88)).toBeCloseTo(100, 5);
    expect(predictedExpressionCeiling(100)).toBeCloseTo(103, 5);
  });
});

describe("R02 evaluateIntonationCeiling", () => {
  it("emits 'ceiling_stuck' tip when expression is at the formula ceiling", () => {
    // intonation 88 → ceiling 100.0. expression 100 → gap 0 → stuck.
    const r = evaluateIntonationCeiling(
      buildScore({ intonation: 88, expression_score: 100 }),
    );
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R02.ceiling_stuck");
    expect(r[0].severity).toBe("tip");
    expect(r[0].metrics.predicted_ceiling).toBeCloseTo(100, 1);
  });

  it("emits 'ceiling_stuck' within epsilon (1.5)", () => {
    // intonation 80 → ceiling 98. expression 96.5 → gap 1.5 → within epsilon.
    const r = evaluateIntonationCeiling(
      buildScore({ intonation: 80, expression_score: 96.5 }),
    );
    expect(r).toHaveLength(1);
  });

  it("does NOT emit when expression is far below ceiling (other bottleneck)", () => {
    // intonation 90 → ceiling 100.5. expression 85 → gap 15.5.
    const r = evaluateIntonationCeiling(
      buildScore({ intonation: 90, expression_score: 85 }),
    );
    expect(r).toEqual([]);
  });

  it("does NOT fire for intonation < 80 (formula invalid)", () => {
    expect(
      evaluateIntonationCeiling(
        buildScore({ intonation: 79, expression_score: 95 }),
      ),
    ).toEqual([]);
    expect(
      evaluateIntonationCeiling(
        buildScore({ intonation: 50, expression_score: 85 }),
      ),
    ).toEqual([]);
  });

  it("returns [] when intonation is null", () => {
    expect(
      evaluateIntonationCeiling(
        buildScore({ intonation: null, expression_score: 95 }),
      ),
    ).toEqual([]);
  });

  it("returns [] when expression_score is null", () => {
    expect(
      evaluateIntonationCeiling(
        buildScore({ intonation: 90, expression_score: null }),
      ),
    ).toEqual([]);
  });

  it("reports the +5 intonation target ceiling", () => {
    // intonation 80 → current ceiling 98, +5 → 99.25
    const r = evaluateIntonationCeiling(
      buildScore({ intonation: 80, expression_score: 98 }),
    );
    expect(r[0].metrics.next_ceiling_at_plus5).toBeCloseTo(99.25, 1);
  });
});
