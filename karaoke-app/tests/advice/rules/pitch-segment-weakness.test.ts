import { describe, expect, it } from "vitest";
import { evaluatePitchSegmentWeakness } from "@/lib/advice/rules/pitch-segment-weakness";
import { buildRawXml, buildScore } from "./_helpers";

function pitchXml(points: number[], flags?: string[]): unknown {
  if (points.length !== 24) throw new Error("need 24 points");
  const attrs: Record<string, string | number> = {};
  for (let i = 0; i < 24; i++) {
    const key = `intervalGraphPointsSection${String(i + 1).padStart(2, "0")}`;
    attrs[key] = points[i];
    if (flags) {
      const flagKey = `aiSensitivityGraphIndexSection${String(i + 1).padStart(2, "0")}`;
      attrs[flagKey] = flags[i];
    }
  }
  return buildRawXml(attrs);
}

describe("R08 evaluatePitchSegmentWeakness", () => {
  it("fires when one section is 15+ points below overall mean", () => {
    const points = new Array(24).fill(85);
    points[23] = 35;
    const r = evaluatePitchSegmentWeakness(
      buildScore({ raw_xml: pitchXml(points) }),
    );
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R08.weak_segment");
    expect(r[0].metrics.section).toBe(24);
    expect(r[0].metrics.section_score).toBe(35);
  });

  it("adds the B'01/B'10 flag to the label when available", () => {
    const points = new Array(24).fill(85);
    points[11] = 30;
    const flags = new Array(24).fill("B'01");
    flags[11] = "B'10";
    const r = evaluatePitchSegmentWeakness(
      buildScore({ raw_xml: pitchXml(points, flags) }),
    );
    expect(r[0].title).toContain("B'10");
  });

  it("does NOT fire when the gap is under 15", () => {
    const points = new Array(24).fill(80);
    points[5] = 70;
    const r = evaluatePitchSegmentWeakness(
      buildScore({ raw_xml: pitchXml(points) }),
    );
    expect(r).toEqual([]);
  });

  it("returns [] when raw_xml null", () => {
    expect(
      evaluatePitchSegmentWeakness(buildScore({ raw_xml: null })),
    ).toEqual([]);
  });

  it("returns [] when interval points absent", () => {
    expect(
      evaluatePitchSegmentWeakness(
        buildScore({ raw_xml: buildRawXml({}) }),
      ),
    ).toEqual([]);
  });

  it("picks the first occurrence on ties", () => {
    const points = new Array(24).fill(85);
    points[3] = 40;
    points[17] = 40;
    const r = evaluatePitchSegmentWeakness(
      buildScore({ raw_xml: pitchXml(points) }),
    );
    expect(r[0].metrics.section).toBe(4);
  });
});
