import { describe, expect, it } from "vitest";
import { evaluateAiDeductSegment } from "@/lib/advice/rules/ai-deduct-segment";
import { buildRawXml, buildScore } from "./_helpers";

function deductXml(values: number[], flags?: string[]): unknown {
  if (values.length !== 24) throw new Error("need 24 values");
  const attrs: Record<string, string | number> = {};
  for (let i = 0; i < 24; i++) {
    const key = `aiSensitivityGraphDeductPointsSection${String(i + 1).padStart(2, "0")}`;
    attrs[key] = values[i];
    if (flags) {
      const flagKey = `aiSensitivityGraphIndexSection${String(i + 1).padStart(2, "0")}`;
      attrs[flagKey] = flags[i];
    }
  }
  return buildRawXml(attrs);
}

describe("R11 evaluateAiDeductSegment", () => {
  it("fires when max deduct > 30", () => {
    const values = new Array(24).fill(0);
    values[19] = 80; // section 20
    const r = evaluateAiDeductSegment(
      buildScore({ raw_xml: deductXml(values) }),
    );
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R11.deduct_segment");
    expect(r[0].metrics.section).toBe(20);
    expect(r[0].metrics.deduct_value).toBe(80);
  });

  it("includes section flag in label when present", () => {
    const values = new Array(24).fill(0);
    values[19] = 80;
    const flags = new Array(24).fill("B'01");
    flags[19] = "B'10";
    const r = evaluateAiDeductSegment(
      buildScore({ raw_xml: deductXml(values, flags) }),
    );
    expect(r[0].title).toContain("B'10");
  });

  it("does NOT fire when max deduct <= 30", () => {
    const values = new Array(24).fill(0);
    values[5] = 25;
    const r = evaluateAiDeductSegment(
      buildScore({ raw_xml: deductXml(values) }),
    );
    expect(r).toEqual([]);
  });

  it("does NOT fire when all sections have 0 deduct", () => {
    const r = evaluateAiDeductSegment(
      buildScore({ raw_xml: deductXml(new Array(24).fill(0)) }),
    );
    expect(r).toEqual([]);
  });

  it("returns [] when raw_xml null", () => {
    expect(
      evaluateAiDeductSegment(buildScore({ raw_xml: null })),
    ).toEqual([]);
  });

  it("returns [] when deduct array absent (not enough sections)", () => {
    expect(
      evaluateAiDeductSegment(buildScore({ raw_xml: buildRawXml({}) })),
    ).toEqual([]);
  });
});
