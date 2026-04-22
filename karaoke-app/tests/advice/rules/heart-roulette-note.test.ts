import { describe, expect, it } from "vitest";
import { evaluateHeartRouletteNote } from "@/lib/advice/rules/heart-roulette-note";
import { buildScore } from "./_helpers";

describe("R10 evaluateHeartRouletteNote", () => {
  it("fires for ai_heart with total >= 99.95", () => {
    const r = evaluateHeartRouletteNote(
      buildScore({ scoring_type: "ai_heart", total_score: 99.95 }),
    );
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R10.heart_roulette");
    expect(r[0].severity).toBe("info");
    expect(r[0].source).toBe("official");
  });

  it("fires at 100.000", () => {
    const r = evaluateHeartRouletteNote(
      buildScore({ scoring_type: "ai_heart", total_score: 100.0 }),
    );
    expect(r).toHaveLength(1);
  });

  it("does NOT fire below 99.95", () => {
    expect(
      evaluateHeartRouletteNote(
        buildScore({ scoring_type: "ai_heart", total_score: 99.9 }),
      ),
    ).toEqual([]);
  });

  it("does NOT fire for scoring_type='ai' (only Heart)", () => {
    expect(
      evaluateHeartRouletteNote(
        buildScore({ scoring_type: "ai", total_score: 99.98 }),
      ),
    ).toEqual([]);
  });

  it("does NOT fire for DX-G", () => {
    expect(
      evaluateHeartRouletteNote(
        buildScore({ scoring_type: "dxg", total_score: 99.99 }),
      ),
    ).toEqual([]);
  });
});
