/**
 * Pure extractors for `scores.raw_xml` JSONB payloads.
 *
 * Two shapes exist in the DB historically:
 *   (a) Python PoC via `xmltodict.parse`:
 *         { "scoring": { "@intonation": "77", "#text": "90298", ... } }
 *   (b) Edge Function via `fast-xml-parser` with attributeNamePrefix="@_":
 *         { "@_intonation": "77", "#text": "90298", ... }
 *
 * `readAttr` abstracts over both shapes. All extractors below sit on top
 * of it so they work regardless of which sync pipeline wrote the row.
 *
 * Every function is pure: same input → same output, no I/O, no clock.
 * Tested in tests/advice/raw-xml-extract.test.ts.
 */

// ---------------------------------------------------------------------------
// Low-level navigation
// ---------------------------------------------------------------------------

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

/**
 * Resolve the `<scoring>` attribute bag from either of the observed shapes.
 * Returns null if the input isn't a JSONB-ish object. Callers must null-check.
 */
function scoringBag(rawXml: unknown): Record<string, unknown> | null {
  const root = asRecord(rawXml);
  if (!root) return null;
  // Shape (a): { scoring: { ... } }
  const wrapped = asRecord(root.scoring);
  if (wrapped) return wrapped;
  // Shape (b): already unwrapped
  return root;
}

/**
 * Read one attribute. Tries both `@KEY` (xmltodict / PoC) and `@_KEY`
 * (fast-xml-parser / Edge Function). Returns string or null.
 * Empty strings are treated as null — DAM returns "" for unset spare fields.
 */
export function readAttr(rawXml: unknown, name: string): string | null {
  const bag = scoringBag(rawXml);
  if (!bag) return null;
  const candidates = [`@${name}`, `@_${name}`];
  for (const k of candidates) {
    const v = bag[k];
    if (v === undefined || v === null) continue;
    const s = String(v);
    if (s === "") continue;
    return s;
  }
  return null;
}

function readInt(rawXml: unknown, name: string): number | null {
  const raw = readAttr(rawXml, name);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function readScaled(
  rawXml: unknown,
  name: string,
  divisor: number,
): number | null {
  const raw = readAttr(rawXml, name);
  if (raw === null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n / divisor;
}

// ---------------------------------------------------------------------------
// Single-field extractors
// ---------------------------------------------------------------------------

/** 抑揚 (0-100). Also exposed as scores.intonation column going forward. */
export function extractIntonation(rawXml: unknown): number | null {
  return readInt(rawXml, "intonation");
}

/** maxTotalPoints on the 1000× scale (so "94109" → 94.109). Semantics TBD. */
export function extractMaxTotalPoints(rawXml: unknown): number | null {
  return readScaled(rawXml, "maxTotalPoints", 1000);
}

/** DAM's canned comment id from the result screen. */
export function extractAnalysisReportCommentNo(
  rawXml: unknown,
): number | null {
  return readInt(rawXml, "analysisReportCommentNo");
}

// ---------------------------------------------------------------------------
// Technique counts (shakuri / kobushi / fall / vibrato / accent / ...)
// ---------------------------------------------------------------------------

export type TechniqueCounts = {
  kobushi: number | null;
  shakuri: number | null;
  fall: number | null;
  vibrato: number | null;
  /** Accent (Ai Heart surfaces this). */
  accent: number | null;
  /** Hammering-on (Ai Heart surfaces this). */
  hammering: number | null;
  edgeVoice: number | null;
  hiccup: number | null;
};

export function extractTechniqueCounts(rawXml: unknown): TechniqueCounts {
  return {
    kobushi: readInt(rawXml, "kobushiCount"),
    shakuri: readInt(rawXml, "shakuriCount"),
    fall: readInt(rawXml, "fallCount"),
    vibrato: readInt(rawXml, "vibratoCount"),
    accent: readInt(rawXml, "accentCount"),
    hammering: readInt(rawXml, "hammeringOnCount"),
    edgeVoice: readInt(rawXml, "edgeVoiceCount"),
    hiccup: readInt(rawXml, "hiccupCount"),
  };
}

/** Count how many distinct technique categories were used at least once. */
export function techniqueVariety(counts: TechniqueCounts): number {
  return (Object.values(counts) as (number | null)[]).filter(
    (v) => v !== null && v > 0,
  ).length;
}

// ---------------------------------------------------------------------------
// Vibrato metadata
// ---------------------------------------------------------------------------

export type VibratoMeta = {
  /** Numeric code; meaning resolved in lib/advice/vibrato-type-map.ts. */
  typeCode: number | null;
  /** 0–10-ish skill rating. */
  skill: number | null;
  /** Total seconds of vibrato detected across the song. */
  totalSeconds: number | null;
  /** Number of distinct vibratos in the song. */
  count: number | null;
  /** Longtone skill is scored alongside vibrato (radar V&L axis combines both). */
  longtoneSkill: number | null;
};

export function extractVibratoMeta(rawXml: unknown): VibratoMeta {
  return {
    typeCode: readInt(rawXml, "vibratoType"),
    skill: readInt(rawXml, "vibratoSkill"),
    totalSeconds: readInt(rawXml, "vibratoTotalSecond"),
    count: readInt(rawXml, "vibratoCount"),
    longtoneSkill: readInt(rawXml, "longtoneSkill"),
  };
}

// ---------------------------------------------------------------------------
// Ai sensitivity meter
// ---------------------------------------------------------------------------

export type AiSensitivityMeter = {
  /** Add-side meter value, 0-100 scale. */
  add: number | null;
  /** Deduct-side meter value, 0-100 scale. */
  deduct: number | null;
  /** Net meter value, 0-100 scale. */
  points: number | null;
};

export function extractAiSensitivityMeter(
  rawXml: unknown,
): AiSensitivityMeter {
  return {
    add: readInt(rawXml, "aiSensitivityMeterAdd"),
    deduct: readInt(rawXml, "aiSensitivityMeterDeduct"),
    points: readInt(rawXml, "aiSensitivityPoints"),
  };
}

// ---------------------------------------------------------------------------
// 24-section interval data
// ---------------------------------------------------------------------------

export type IntervalGraph = {
  /** 24 pitch-score points (0-100 each). null if any section is missing. */
  pitchPoints: number[] | null;
  /** 24 Ai-sensitivity add points per section. */
  aiAddPoints: number[] | null;
  /** 24 Ai-sensitivity deduct points per section. */
  aiDeductPoints: number[] | null;
  /** 24 melody-section flags (e.g. "B'01" / "B'10"). null if missing. */
  sectionFlags: string[] | null;
};

function readSectionArray(
  rawXml: unknown,
  prefix: string,
): number[] | null {
  const out: number[] = [];
  for (let i = 1; i <= 24; i++) {
    const key = `${prefix}${i.toString().padStart(2, "0")}`;
    const raw = readAttr(rawXml, key);
    if (raw === null) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    out.push(Math.trunc(n));
  }
  return out;
}

function readSectionStringArray(
  rawXml: unknown,
  prefix: string,
): string[] | null {
  const out: string[] = [];
  for (let i = 1; i <= 24; i++) {
    const key = `${prefix}${i.toString().padStart(2, "0")}`;
    const raw = readAttr(rawXml, key);
    if (raw === null) return null;
    out.push(raw);
  }
  return out;
}

export function extractIntervalGraph(rawXml: unknown): IntervalGraph {
  return {
    pitchPoints: readSectionArray(rawXml, "intervalGraphPointsSection"),
    aiAddPoints: readSectionArray(rawXml, "aiSensitivityGraphAddPointsSection"),
    aiDeductPoints: readSectionArray(
      rawXml,
      "aiSensitivityGraphDeductPointsSection",
    ),
    sectionFlags: readSectionStringArray(
      rawXml,
      "aiSensitivityGraphIndexSection",
    ),
  };
}

// ---------------------------------------------------------------------------
// National average (per-axis benchmark comparison)
// ---------------------------------------------------------------------------

export type NationalAverage = {
  /** Total score on the 1000× scale (same as scores.total_score). */
  totalScore: number | null;
  pitch: number | null;
  stability: number | null;
  expression: number | null;
  /** DAM concatenates vibrato + longtone into one axis here. */
  vibratoAndLongtone: number | null;
  rhythm: number | null;
};

export function extractNationalAverage(rawXml: unknown): NationalAverage {
  return {
    totalScore: readScaled(rawXml, "nationalAverageTotalPoints", 1000),
    pitch: readInt(rawXml, "nationalAveragePitch"),
    stability: readInt(rawXml, "nationalAverageStability"),
    expression: readInt(rawXml, "nationalAverageExpression"),
    vibratoAndLongtone: readInt(rawXml, "nationalAverageVibratoAndLongtone"),
    rhythm: readInt(rawXml, "nationalAverageRhythm"),
  };
}
