import { describe, expect, it } from "vitest";
import { evaluateSongCeiling } from "@/lib/advice/rules/song-ceiling";
import { buildRawXml, buildScore } from "./_helpers";

describe("R13 evaluateSongCeiling", () => {
  it("fires when maxTotalPoints is within 1.0 of total_score", () => {
    const r = evaluateSongCeiling(
      buildScore({
        total_score: 93.5,
        raw_xml: buildRawXml({ maxTotalPoints: 94200 }), // 94.200
      }),
    );
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R13.near_ceiling");
    expect(r[0].severity).toBe("info");
    expect(r[0].confidence).toBe("low");
    expect(r[0].metrics.delta).toBeCloseTo(0.7, 2);
  });

  it("does NOT fire when the gap is 1.0 or more", () => {
    const r = evaluateSongCeiling(
      buildScore({
        total_score: 90.3,
        raw_xml: buildRawXml({ maxTotalPoints: 94100 }),
      }),
    );
    expect(r).toEqual([]);
  });

  it("silently skips when maxTotalPoints is below total_score (hypothesis fails)", () => {
    const r = evaluateSongCeiling(
      buildScore({
        total_score: 96.0,
        raw_xml: buildRawXml({ maxTotalPoints: 94000 }),
      }),
    );
    expect(r).toEqual([]);
  });

  it("returns [] when maxTotalPoints absent", () => {
    expect(
      evaluateSongCeiling(buildScore({ raw_xml: buildRawXml({}) })),
    ).toEqual([]);
  });

  it("returns [] when raw_xml null", () => {
    expect(evaluateSongCeiling(buildScore({ raw_xml: null }))).toEqual([]);
  });

  it("message includes the DAM-unpublished disclaimer", () => {
    const r = evaluateSongCeiling(
      buildScore({
        total_score: 93.8,
        raw_xml: buildRawXml({ maxTotalPoints: 94100 }),
      }),
    );
    expect(r[0].message).toContain("DAM 非公開");
  });
});
