import { describe, expect, it } from "vitest";
import { evaluateMelodySection } from "@/lib/advice/rules/melody-section";
import { buildRawXml, buildScore } from "./_helpers";

function sectionXml(points: number[], flags: string[]): unknown {
  if (points.length !== 24 || flags.length !== 24)
    throw new Error("need 24");
  const attrs: Record<string, string | number> = {};
  for (let i = 0; i < 24; i++) {
    const ptsKey = `intervalGraphPointsSection${String(i + 1).padStart(2, "0")}`;
    const flagKey = `aiSensitivityGraphIndexSection${String(i + 1).padStart(2, "0")}`;
    attrs[ptsKey] = points[i];
    attrs[flagKey] = flags[i];
  }
  return buildRawXml(attrs);
}

describe("R14 evaluateMelodySection", () => {
  it("fires when gap between B'01 / B'10 groups >= 8", () => {
    const points = new Array(24).fill(70);
    const flags = new Array(24).fill("B'01");
    // make the B'10 group score much higher
    for (let i = 12; i < 24; i++) {
      flags[i] = "B'10";
      points[i] = 85;
    }
    const r = evaluateMelodySection(
      buildScore({ raw_xml: sectionXml(points, flags) }),
    );
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R14.weak_section_group");
    expect(r[0].confidence).toBe("low");
    expect(r[0].title).toContain("B'01"); // weak group
  });

  it("does NOT fire when gap < 8", () => {
    const points = new Array(24).fill(80);
    const flags = new Array(24).fill("B'01");
    for (let i = 12; i < 24; i++) {
      flags[i] = "B'10";
      points[i] = 83; // gap only 3
    }
    const r = evaluateMelodySection(
      buildScore({ raw_xml: sectionXml(points, flags) }),
    );
    expect(r).toEqual([]);
  });

  it("returns [] when all sections have same flag (can't compare groups)", () => {
    const points = new Array(24).fill(70);
    const flags = new Array(24).fill("B'01");
    const r = evaluateMelodySection(
      buildScore({ raw_xml: sectionXml(points, flags) }),
    );
    expect(r).toEqual([]);
  });

  it("returns [] when raw_xml null", () => {
    expect(evaluateMelodySection(buildScore({ raw_xml: null }))).toEqual([]);
  });

  it("returns [] when pitch points are missing", () => {
    // flags present but points array incomplete
    const attrs: Record<string, string | number> = {};
    for (let i = 1; i <= 24; i++) {
      attrs[`aiSensitivityGraphIndexSection${String(i).padStart(2, "0")}`] =
        i < 13 ? "B'01" : "B'10";
    }
    const r = evaluateMelodySection(
      buildScore({ raw_xml: buildRawXml(attrs) }),
    );
    expect(r).toEqual([]);
  });
});
