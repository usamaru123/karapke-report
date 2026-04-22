import { describe, expect, it } from "vitest";
import {
  extractAiSensitivityMeter,
  extractAnalysisReportCommentNo,
  extractIntervalGraph,
  extractIntonation,
  extractMaxTotalPoints,
  extractNationalAverage,
  extractTechniqueCounts,
  extractVibratoMeta,
  readAttr,
  techniqueVariety,
} from "@/lib/advice/raw-xml-extract";

/**
 * Fixture A: xmltodict-style (Python PoC). Attribute prefix "@", outer
 * "scoring" wrapper. This is the shape of the existing 200 rows in the
 * production DB at the time of implementation.
 */
const WRAPPED_AT: Record<string, unknown> = {
  scoring: {
    "#text": "90298",
    "@intonation": "77",
    "@maxTotalPoints": "94109",
    "@analysisReportCommentNo": "3672",
    "@kobushiCount": "3",
    "@shakuriCount": "32",
    "@fallCount": "2",
    "@vibratoCount": "9",
    "@accentCount": "0",
    "@hammeringOnCount": "0",
    "@edgeVoiceCount": "0",
    "@hiccupCount": "0",
    "@vibratoType": "10",
    "@vibratoSkill": "3",
    "@vibratoTotalSecond": "20",
    "@longtoneSkill": "7",
    "@aiSensitivityMeterAdd": "81",
    "@aiSensitivityMeterDeduct": "15",
    "@aiSensitivityPoints": "78",
    "@nationalAveragePitch": "73",
    "@nationalAverageStability": "73",
    "@nationalAverageExpression": "66",
    "@nationalAverageVibratoAndLongtone": "73",
    "@nationalAverageRhythm": "93",
    "@nationalAverageTotalPoints": "84760",
    "@spare1": "",
    // Interval arrays
    ...Object.fromEntries(
      Array.from({ length: 24 }, (_, i) => [
        `@intervalGraphPointsSection${String(i + 1).padStart(2, "0")}`,
        String(70 + i), // 70..93
      ]),
    ),
    ...Object.fromEntries(
      Array.from({ length: 24 }, (_, i) => [
        `@aiSensitivityGraphAddPointsSection${String(i + 1).padStart(2, "0")}`,
        String(i * 2), // 0, 2, 4, ...
      ]),
    ),
    ...Object.fromEntries(
      Array.from({ length: 24 }, (_, i) => [
        `@aiSensitivityGraphDeductPointsSection${String(i + 1).padStart(2, "0")}`,
        i === 19 ? "80" : "0",
      ]),
    ),
    ...Object.fromEntries(
      Array.from({ length: 24 }, (_, i) => [
        `@aiSensitivityGraphIndexSection${String(i + 1).padStart(2, "0")}`,
        i < 12 ? "B'01" : "B'10",
      ]),
    ),
  },
};

/**
 * Fixture B: fast-xml-parser style (Edge Function). Attribute prefix "@_",
 * no outer wrapper. This is the shape NEW rows will have going forward.
 */
const UNWRAPPED_UNDERSCORE: Record<string, unknown> = {
  "#text": "90298",
  "@_intonation": "77",
  "@_kobushiCount": "3",
  "@_vibratoType": "6",
};

describe("readAttr", () => {
  it("reads from wrapped xmltodict shape (@)", () => {
    expect(readAttr(WRAPPED_AT, "intonation")).toBe("77");
  });

  it("reads from unwrapped fast-xml-parser shape (@_)", () => {
    expect(readAttr(UNWRAPPED_UNDERSCORE, "intonation")).toBe("77");
  });

  it("returns null for missing keys", () => {
    expect(readAttr(WRAPPED_AT, "nonexistentKey")).toBeNull();
  });

  it("treats empty string as null (spare fields)", () => {
    expect(readAttr(WRAPPED_AT, "spare1")).toBeNull();
  });

  it("returns null for null / non-object inputs", () => {
    expect(readAttr(null, "intonation")).toBeNull();
    expect(readAttr(undefined, "intonation")).toBeNull();
    expect(readAttr("not an object", "intonation")).toBeNull();
    expect(readAttr(42, "intonation")).toBeNull();
    expect(readAttr([1, 2, 3], "intonation")).toBeNull();
  });

  it("prefers @ prefix when both exist (wrapped takes precedence)", () => {
    const mixed = { scoring: { "@intonation": "50" }, "@_intonation": "99" };
    // scoringBag detects the wrapped shape first and returns the inner bag,
    // so @_ on the outer object is ignored. Documenting that contract here.
    expect(readAttr(mixed, "intonation")).toBe("50");
  });
});

describe("extractIntonation", () => {
  it("returns numeric intonation from both shapes", () => {
    expect(extractIntonation(WRAPPED_AT)).toBe(77);
    expect(extractIntonation(UNWRAPPED_UNDERSCORE)).toBe(77);
  });

  it("returns null when intonation missing", () => {
    expect(extractIntonation({ scoring: {} })).toBeNull();
  });

  it("returns null on non-numeric values", () => {
    expect(extractIntonation({ scoring: { "@intonation": "abc" } })).toBeNull();
  });
});

describe("extractMaxTotalPoints", () => {
  it("scales by 1000", () => {
    expect(extractMaxTotalPoints(WRAPPED_AT)).toBeCloseTo(94.109, 3);
  });

  it("returns null when missing", () => {
    expect(extractMaxTotalPoints({ scoring: {} })).toBeNull();
  });
});

describe("extractAnalysisReportCommentNo", () => {
  it("returns integer", () => {
    expect(extractAnalysisReportCommentNo(WRAPPED_AT)).toBe(3672);
  });
});

describe("extractTechniqueCounts", () => {
  it("returns all 8 counts from wrapped shape", () => {
    expect(extractTechniqueCounts(WRAPPED_AT)).toEqual({
      kobushi: 3,
      shakuri: 32,
      fall: 2,
      vibrato: 9,
      accent: 0,
      hammering: 0,
      edgeVoice: 0,
      hiccup: 0,
    });
  });

  it("fills with nulls for missing counts", () => {
    expect(extractTechniqueCounts({ scoring: {} })).toEqual({
      kobushi: null,
      shakuri: null,
      fall: null,
      vibrato: null,
      accent: null,
      hammering: null,
      edgeVoice: null,
      hiccup: null,
    });
  });
});

describe("techniqueVariety", () => {
  it("counts only non-null, positive entries", () => {
    expect(
      techniqueVariety({
        kobushi: 3,
        shakuri: 32,
        fall: 2,
        vibrato: 9,
        accent: 0,
        hammering: 0,
        edgeVoice: 0,
        hiccup: 0,
      }),
    ).toBe(4);
  });

  it("returns 0 when every count is 0 or null", () => {
    expect(
      techniqueVariety({
        kobushi: 0,
        shakuri: 0,
        fall: 0,
        vibrato: 0,
        accent: null,
        hammering: null,
        edgeVoice: null,
        hiccup: null,
      }),
    ).toBe(0);
  });
});

describe("extractVibratoMeta", () => {
  it("returns all vibrato fields", () => {
    expect(extractVibratoMeta(WRAPPED_AT)).toEqual({
      typeCode: 10,
      skill: 3,
      totalSeconds: 20,
      count: 9,
      longtoneSkill: 7,
    });
  });

  it("handles the @_ shape", () => {
    expect(extractVibratoMeta(UNWRAPPED_UNDERSCORE)).toMatchObject({
      typeCode: 6,
    });
  });
});

describe("extractAiSensitivityMeter", () => {
  it("returns add/deduct/points", () => {
    expect(extractAiSensitivityMeter(WRAPPED_AT)).toEqual({
      add: 81,
      deduct: 15,
      points: 78,
    });
  });
});

describe("extractIntervalGraph", () => {
  it("returns all 24-section arrays", () => {
    const g = extractIntervalGraph(WRAPPED_AT);
    expect(g.pitchPoints).toHaveLength(24);
    expect(g.pitchPoints?.[0]).toBe(70);
    expect(g.pitchPoints?.[23]).toBe(93);

    expect(g.aiAddPoints).toHaveLength(24);
    expect(g.aiAddPoints?.[0]).toBe(0);
    expect(g.aiAddPoints?.[23]).toBe(46);

    expect(g.aiDeductPoints).toHaveLength(24);
    expect(g.aiDeductPoints?.[19]).toBe(80); // the outlier
    expect(g.aiDeductPoints?.[0]).toBe(0);

    expect(g.sectionFlags).toHaveLength(24);
    expect(g.sectionFlags?.[0]).toBe("B'01");
    expect(g.sectionFlags?.[23]).toBe("B'10");
  });

  it("returns null for an array if any section is missing", () => {
    // Drop section 13 — the array should not half-populate.
    const broken = {
      scoring: {
        ...Object.fromEntries(
          Array.from({ length: 24 }, (_, i) => [
            `@intervalGraphPointsSection${String(i + 1).padStart(2, "0")}`,
            String(80),
          ]),
        ),
      },
    };
    delete (broken.scoring as Record<string, unknown>)[
      "@intervalGraphPointsSection13"
    ];
    expect(extractIntervalGraph(broken).pitchPoints).toBeNull();
  });
});

describe("extractNationalAverage", () => {
  it("returns all 6 averages with total_score scaled by 1000", () => {
    expect(extractNationalAverage(WRAPPED_AT)).toEqual({
      totalScore: 84.76,
      pitch: 73,
      stability: 73,
      expression: 66,
      vibratoAndLongtone: 73,
      rhythm: 93,
    });
  });
});
