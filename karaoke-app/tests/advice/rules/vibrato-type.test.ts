import { describe, expect, it } from "vitest";
import { evaluateVibratoType } from "@/lib/advice/rules/vibrato-type";
import { buildRawXml, buildScore } from "./_helpers";

describe("R05 evaluateVibratoType", () => {
  it("fires 'no_vibrato' for N type (code 0)", () => {
    const r = evaluateVibratoType(
      buildScore({
        raw_xml: buildRawXml({
          vibratoType: 0,
          vibratoSkill: 0,
          vibratoTotalSecond: 0,
          vibratoCount: 0,
        }),
      }),
    );
    expect(r.some((f) => f.ruleId === "R05.no_vibrato")).toBe(true);
  });

  it("fires 'chirimen' tip for A series (code 1-3)", () => {
    const r = evaluateVibratoType(
      buildScore({
        raw_xml: buildRawXml({
          vibratoType: 2, // A-2
          vibratoSkill: 4,
          vibratoTotalSecond: 15,
          vibratoCount: 8,
        }),
      }),
    );
    expect(r.some((f) => f.ruleId === "R05.chirimen")).toBe(true);
  });

  it("fires 'non_box' tip for D-H (code 10-14)", () => {
    const r = evaluateVibratoType(
      buildScore({
        raw_xml: buildRawXml({
          vibratoType: 13, // G (non-box)
          vibratoSkill: 6,
          vibratoTotalSecond: 41,
          vibratoCount: 12,
        }),
      }),
    );
    expect(r.some((f) => f.ruleId === "R05.non_box")).toBe(true);
  });

  it("fires 'recommended' info for B-3 (code 6)", () => {
    const r = evaluateVibratoType(
      buildScore({
        raw_xml: buildRawXml({
          vibratoType: 6, // B-3
          vibratoSkill: 8,
          vibratoTotalSecond: 30,
          vibratoCount: 10,
        }),
      }),
    );
    expect(r.some((f) => f.ruleId === "R05.recommended")).toBe(true);
  });

  it("fires 'short_duration' tip when totalSeconds < 5 (independent of type)", () => {
    const r = evaluateVibratoType(
      buildScore({
        raw_xml: buildRawXml({
          vibratoType: 6, // B-3 (recommended)
          vibratoSkill: 5,
          vibratoTotalSecond: 3,
          vibratoCount: 1,
        }),
      }),
    );
    // both recommended and short_duration should fire
    expect(r.some((f) => f.ruleId === "R05.short_duration")).toBe(true);
  });

  it("does NOT fire short_duration when totalSeconds is 0 (treated as no data / N type covers it)", () => {
    const r = evaluateVibratoType(
      buildScore({
        raw_xml: buildRawXml({
          vibratoType: 0,
          vibratoSkill: 0,
          vibratoTotalSecond: 0,
          vibratoCount: 0,
        }),
      }),
    );
    expect(r.some((f) => f.ruleId === "R05.short_duration")).toBe(false);
  });

  it("returns [] when raw_xml is null", () => {
    expect(evaluateVibratoType(buildScore({ raw_xml: null }))).toEqual([]);
  });

  it("returns [] when vibrato fields all absent in raw_xml", () => {
    expect(
      evaluateVibratoType(buildScore({ raw_xml: buildRawXml({}) })),
    ).toEqual([]);
  });
});
