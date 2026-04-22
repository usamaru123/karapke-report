import { describe, expect, it } from "vitest";
import { evaluateNationalAverage } from "@/lib/advice/rules/national-average";
import { buildRawXml, buildScore } from "./_helpers";

function avgXml(
  averages: Partial<{
    pitch: number;
    stability: number;
    expression: number;
    vibrato: number;
    rhythm: number;
    total: number;
  }>,
): unknown {
  const attrs: Record<string, string | number> = {};
  if (averages.pitch !== undefined) attrs.nationalAveragePitch = averages.pitch;
  if (averages.stability !== undefined)
    attrs.nationalAverageStability = averages.stability;
  if (averages.expression !== undefined)
    attrs.nationalAverageExpression = averages.expression;
  if (averages.vibrato !== undefined)
    attrs.nationalAverageVibratoAndLongtone = averages.vibrato;
  if (averages.rhythm !== undefined)
    attrs.nationalAverageRhythm = averages.rhythm;
  if (averages.total !== undefined)
    attrs.nationalAverageTotalPoints = averages.total * 1000;
  return buildRawXml(attrs);
}

describe("R12 evaluateNationalAverage", () => {
  it("emits 'growth_room' when self is 5+ below average on some axis", () => {
    const r = evaluateNationalAverage(
      buildScore({
        expression_score: 60,
        raw_xml: avgXml({ expression: 70 }),
      }),
    );
    expect(r.some((f) => f.ruleId === "R12.growth_room")).toBe(true);
    const growth = r.find((f) => f.ruleId === "R12.growth_room")!;
    expect(growth.title).toContain("表現力");
  });

  it("emits 'strength' when self is 10+ above average on some axis", () => {
    const r = evaluateNationalAverage(
      buildScore({
        rhythm_score: 98,
        raw_xml: avgXml({ rhythm: 80 }),
      }),
    );
    expect(r.some((f) => f.ruleId === "R12.strength")).toBe(true);
  });

  it("picks only the single most-behind axis (no 5 messages)", () => {
    const r = evaluateNationalAverage(
      buildScore({
        pitch_score: 60,
        stability_score: 60,
        expression_score: 60,
        vibrato_longtone_score: 60,
        rhythm_score: 60,
        raw_xml: avgXml({
          pitch: 70,
          stability: 75,
          expression: 80,
          vibrato: 72,
          rhythm: 85,
        }),
      }),
    );
    const growths = r.filter((f) => f.ruleId === "R12.growth_room");
    expect(growths.length).toBe(1);
    // rhythm has the widest gap (-25), so it should be selected.
    expect(growths[0].title).toContain("リズム");
  });

  it("returns [] when all axes are within ±threshold", () => {
    const r = evaluateNationalAverage(
      buildScore({
        pitch_score: 80,
        stability_score: 80,
        expression_score: 80,
        vibrato_longtone_score: 80,
        rhythm_score: 80,
        raw_xml: avgXml({
          pitch: 82,
          stability: 78,
          expression: 80,
          vibrato: 83,
          rhythm: 77,
        }),
      }),
    );
    expect(r).toEqual([]);
  });

  it("returns [] when raw_xml null", () => {
    expect(
      evaluateNationalAverage(buildScore({ raw_xml: null })),
    ).toEqual([]);
  });

  it("silently skips axes where self or avg is null (no crash, no finding)", () => {
    const r = evaluateNationalAverage(
      buildScore({
        rhythm_score: null,
        raw_xml: avgXml({ rhythm: 80 }),
      }),
    );
    // rhythm skipped, other axes all close to average → no findings
    expect(r).toEqual([]);
  });
});
