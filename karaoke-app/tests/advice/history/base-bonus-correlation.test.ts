import { describe, expect, it } from "vitest";
import { evaluateBaseBonusCorrelation } from "@/lib/advice/rules/base-bonus-correlation";
import { buildHistoryScore } from "./_history-helpers";

describe("R23 evaluateBaseBonusCorrelation", () => {
  it("fires when base and bonus are strongly negatively correlated", () => {
    const scores = [];
    // 構造: base が上がるほど bonus が下がるデータを 6 件
    const pairs: Array<[number, number]> = [
      [85, 6],
      [88, 5],
      [90, 4],
      [93, 3],
      [95, 2],
      [96, 1.5],
    ];
    for (const [base, bonus] of pairs) {
      scores.push(
        buildHistoryScore({
          id: `${base}`,
          total_score: base + bonus,
          ai_bonus: bonus,
        }),
      );
    }
    const r = evaluateBaseBonusCorrelation({ scores });
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R23.negative_correlation");
    expect(r[0].metrics.correlation).toBeLessThan(-0.3);
  });

  it("does NOT fire when correlation is weak or positive", () => {
    const scores = [];
    // base と bonus がほぼ無相関
    const pairs: Array<[number, number]> = [
      [85, 3],
      [88, 4],
      [90, 3],
      [93, 4],
      [95, 3],
      [96, 4],
    ];
    for (const [base, bonus] of pairs) {
      scores.push(
        buildHistoryScore({
          id: `${base}`,
          total_score: base + bonus,
          ai_bonus: bonus,
        }),
      );
    }
    expect(evaluateBaseBonusCorrelation({ scores })).toEqual([]);
  });

  it("returns [] with fewer than 5 Ai samples", () => {
    expect(
      evaluateBaseBonusCorrelation({
        scores: [
          buildHistoryScore({ id: "1", total_score: 90, ai_bonus: 3 }),
          buildHistoryScore({ id: "2", total_score: 91, ai_bonus: 2 }),
          buildHistoryScore({ id: "3", total_score: 92, ai_bonus: 1 }),
        ],
      }),
    ).toEqual([]);
  });

  it("excludes non-ai scoring types", () => {
    const scores = [
      buildHistoryScore({
        id: "1",
        scoring_type: "ai_heart",
        total_score: 90,
        ai_bonus: 3,
      }),
      buildHistoryScore({
        id: "2",
        scoring_type: "dxg",
        total_score: 85,
        ai_bonus: null,
      }),
    ];
    expect(evaluateBaseBonusCorrelation({ scores })).toEqual([]);
  });
});
