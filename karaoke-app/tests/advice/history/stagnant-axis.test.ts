import { describe, expect, it } from "vitest";
import { evaluateStagnantAxis } from "@/lib/advice/rules/stagnant-axis";
import { buildHistoryScore } from "./_history-helpers";

describe("R21 evaluateStagnantAxis", () => {
  it("fires when one axis is 3+ below the next-weakest mean", () => {
    const scores = [];
    for (let i = 0; i < 5; i++) {
      scores.push(
        buildHistoryScore({
          id: `s${i}`,
          sung_at: `2026-04-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
          pitch_score: 90,
          stability_score: 88,
          expression_score: 89,
          vibrato_longtone_score: 87,
          rhythm_score: 70, // clearly weakest
        }),
      );
    }
    const r = evaluateStagnantAxis({ scores });
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R21.stagnant");
    expect(r[0].title).toContain("リズム");
  });

  it("does NOT fire when axes are within 3 points", () => {
    const scores = [];
    for (let i = 0; i < 5; i++) {
      scores.push(
        buildHistoryScore({
          id: `s${i}`,
          sung_at: `2026-04-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
          pitch_score: 88,
          stability_score: 87,
          expression_score: 86,
          vibrato_longtone_score: 87,
          rhythm_score: 85, // only 1 point below next-weakest
        }),
      );
    }
    expect(evaluateStagnantAxis({ scores })).toEqual([]);
  });

  it("returns [] with fewer than 3 scores", () => {
    expect(
      evaluateStagnantAxis({
        scores: [
          buildHistoryScore({ id: "1", pitch_score: 50 }),
          buildHistoryScore({ id: "2", pitch_score: 50 }),
        ],
      }),
    ).toEqual([]);
  });

  it("only uses the most recent 5 by sung_at", () => {
    // Older scores have a different weak axis; only recent 5 should drive diagnosis.
    const scores = [];
    for (let i = 0; i < 3; i++) {
      scores.push(
        buildHistoryScore({
          id: `old${i}`,
          sung_at: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
          pitch_score: 50, // old weak axis
          rhythm_score: 95,
          stability_score: 90,
          expression_score: 90,
          vibrato_longtone_score: 90,
        }),
      );
    }
    for (let i = 0; i < 5; i++) {
      scores.push(
        buildHistoryScore({
          id: `new${i}`,
          sung_at: `2026-04-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
          pitch_score: 90,
          stability_score: 89,
          expression_score: 88,
          vibrato_longtone_score: 88,
          rhythm_score: 75, // new weak axis
        }),
      );
    }
    const r = evaluateStagnantAxis({ scores });
    expect(r[0].title).toContain("リズム");
  });
});
