import { describe, expect, it } from "vitest";
import { evaluateTechniqueVariety } from "@/lib/advice/rules/technique-variety";
import { buildRawXml, buildScore } from "./_helpers";

describe("R07 evaluateTechniqueVariety", () => {
  it("fires when only 2 categories used (<= 2 boundary)", () => {
    const r = evaluateTechniqueVariety(
      buildScore({
        raw_xml: buildRawXml({
          kobushiCount: 3,
          shakuriCount: 30,
          fallCount: 0,
          vibratoCount: 0,
          accentCount: 0,
          hammeringOnCount: 0,
          edgeVoiceCount: 0,
          hiccupCount: 0,
        }),
      }),
    );
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R07.monotone");
    expect(r[0].metrics.variety).toBe(2);
  });

  it("does NOT fire when 3+ categories used", () => {
    const r = evaluateTechniqueVariety(
      buildScore({
        raw_xml: buildRawXml({
          kobushiCount: 3,
          shakuriCount: 30,
          fallCount: 2,
          vibratoCount: 5,
          accentCount: 0,
          hammeringOnCount: 0,
          edgeVoiceCount: 0,
          hiccupCount: 0,
        }),
      }),
    );
    expect(r).toEqual([]);
  });

  it("lists the used technique names in the message", () => {
    const r = evaluateTechniqueVariety(
      buildScore({
        raw_xml: buildRawXml({
          kobushiCount: 1,
          shakuriCount: 5,
          fallCount: 0,
          vibratoCount: 0,
          accentCount: 0,
          hammeringOnCount: 0,
          edgeVoiceCount: 0,
          hiccupCount: 0,
        }),
      }),
    );
    expect(r[0].message).toContain("こぶし");
    expect(r[0].message).toContain("しゃくり");
  });

  it("returns [] when raw_xml null", () => {
    expect(
      evaluateTechniqueVariety(buildScore({ raw_xml: null })),
    ).toEqual([]);
  });

  it("returns [] when technique fields absent (older sync)", () => {
    expect(
      evaluateTechniqueVariety(buildScore({ raw_xml: buildRawXml({}) })),
    ).toEqual([]);
  });
});
