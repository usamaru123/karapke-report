import { describe, expect, it } from "vitest";
import { evaluateRadarWeakestAxis } from "@/lib/advice/rules/radar-weakest-axis";
import { buildScore } from "./_helpers";

describe("R04 evaluateRadarWeakestAxis", () => {
  it("identifies the weakest axis when gap >= 5", () => {
    // rhythm 75 vs. others ~ 90 → gap ~15 → fires
    const r = evaluateRadarWeakestAxis(
      buildScore({
        pitch_score: 90,
        stability_score: 90,
        expression_score: 90,
        vibrato_longtone_score: 90,
        rhythm_score: 75,
      }),
    );
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R04.weakest_axis");
    expect(r[0].title).toContain("リズム");
    expect(r[0].metrics.weakest_value).toBe(75);
    expect(r[0].metrics.gap).toBeCloseTo(15.0, 1);
  });

  it("does NOT fire when all axes are close (gap < 5)", () => {
    const r = evaluateRadarWeakestAxis(
      buildScore({
        pitch_score: 90,
        stability_score: 89,
        expression_score: 88,
        vibrato_longtone_score: 91,
        rhythm_score: 87, // gap ~2 → below threshold
      }),
    );
    expect(r).toEqual([]);
  });

  it("correctly names the expression axis when it's weakest", () => {
    const r = evaluateRadarWeakestAxis(
      buildScore({
        pitch_score: 95,
        stability_score: 95,
        expression_score: 70,
        vibrato_longtone_score: 95,
        rhythm_score: 95,
      }),
    );
    expect(r[0].title).toContain("表現力");
    expect(r[0].message).toContain("強弱比");
  });

  it("returns [] when fewer than 3 axes are populated", () => {
    // Only 2 non-null axes — too few for a meaningful comparison.
    expect(
      evaluateRadarWeakestAxis(
        buildScore({
          pitch_score: 90,
          stability_score: 70,
          expression_score: null,
          vibrato_longtone_score: null,
          rhythm_score: null,
        }),
      ),
    ).toEqual([]);
  });

  it("uses the OTHER-axes mean, not overall mean (weakest is excluded)", () => {
    // pitch 60, rest 90. overall mean = 84; others-mean = 90; gap = 30.
    // If we mistakenly used overall mean, gap would be 24.
    const r = evaluateRadarWeakestAxis(
      buildScore({
        pitch_score: 60,
        stability_score: 90,
        expression_score: 90,
        vibrato_longtone_score: 90,
        rhythm_score: 90,
      }),
    );
    expect(r[0].metrics.others_mean).toBe(90.0);
    expect(r[0].metrics.gap).toBe(30.0);
  });
});
