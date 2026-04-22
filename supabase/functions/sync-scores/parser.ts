/**
 * XML <scoring> → ParsedScore conversion. Mirrors poc/karaoke-sync-poc/src/parser.py
 * attribute mappings that were empirically verified in Phase 1 (see
 * docs/data-model.md and the parser.py fixes commit).
 */

export type ScoringTypeT =
  | "ai"
  | "ai_heart"
  | "dxg"
  | "dx"
  | "other";

export type ParsedScore = {
  dam_scoring_id: string;
  scoring_type: ScoringTypeT;
  sung_at: Date;
  song_title: string;
  song_artist: string;
  request_no: string | null;
  dam_contents_id: string | null;
  total_score: number;
  pitch_score: number | null;
  stability_score: number | null;
  expression_score: number | null;
  vibrato_longtone_score: number | null;
  rhythm_score: number | null;
  ai_bonus: number | null;
  key_control: number;
  tempo_control: number | null;
  guide_melody: boolean | null;
  singing_range_lowest: number | null;
  singing_range_highest: number | null;
  vocal_range_lowest: number | null;
  vocal_range_highest: number | null;
  pitch_intervals: number[] | null;
  raw_xml: unknown; // xml-as-json for archival in scores.raw_xml (JSONB)
};

// fast-xml-parser emits attributes under this prefix when configured below.
export const ATTR_PREFIX = "@_";
export const TEXT_NODE = "#text";

function attr(el: Record<string, unknown>, name: string): string | null {
  const v = el[`${ATTR_PREFIX}${name}`];
  if (v === undefined || v === null || v === "") return null;
  return String(v);
}

function scaled(v: string | null, divisor: number): number | null {
  if (v === null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n / divisor;
}

function midi(v: string | null): number | null {
  if (v === null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n >= 21 && n <= 108 ? Math.trunc(n) : null;
}

function integer(v: string | null): number | null {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseDamDateTime(v: string | null): Date | null {
  if (!v) return null;
  // YYYYMMDDHHMMSS
  const m14 = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(v);
  if (m14) {
    const [, y, mo, d, h, mi, s] = m14;
    // DAM returns local JST but server stores as UTC. Treat as UTC for consistency
    // with the Python PoC (which did the same).
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
  }
  // Fallbacks: "YYYY-MM-DD HH:MM:SS", ISO, etc.
  const d = new Date(v.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

function inferScoringType(el: Record<string, unknown>): ScoringTypeT {
  for (const a of ["scoringType", "type", "machineType"]) {
    const v = attr(el, a);
    if (!v) continue;
    const s = v.toLowerCase();
    if (s.includes("heart")) return "ai_heart";
    if (s.includes("dxg") || s.includes("dx-g") || s.includes("dx_g")) return "dxg";
    if (s.includes("dx")) return "dx";
    if (s.includes("ai")) return "ai";
  }
  return "ai";
}

function parsePitchIntervals(el: Record<string, unknown>): number[] | null {
  const values: number[] = [];
  for (let i = 1; i <= 24; i++) {
    const key = `intervalGraphPointsSection${i.toString().padStart(2, "0")}`;
    const raw = attr(el, key);
    if (raw === null) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    values.push(Math.trunc(n));
  }
  return values.length === 24 ? values : null;
}

/**
 * Parse one <scoring> element (as yielded by fast-xml-parser) into a
 * ParsedScore. Returns null and logs when required fields are missing.
 */
export function parseScoringElement(
  el: Record<string, unknown>,
): ParsedScore {
  const scoring_ai_id = attr(el, "scoringAiId");
  if (!scoring_ai_id) {
    throw new Error("scoring element has no scoringAiId");
  }

  const sungRaw =
    attr(el, "scoringDateTime") ??
    attr(el, "scoringDate");
  const sung_at = parseDamDateTime(sungRaw);
  if (!sung_at) {
    throw new Error(
      `scoring ${scoring_ai_id}: could not parse sung_at from '${sungRaw}'`,
    );
  }

  const song_title =
    attr(el, "contentsName") ??
    attr(el, "songName") ??
    "(unknown)";
  const song_artist = attr(el, "artistName") ?? "(unknown)";

  // Total score lives in the element's text content. fast-xml-parser with
  // textNodeName:"#text" exposes it under TEXT_NODE.
  const totalRaw = el[TEXT_NODE];
  const total_score =
    scaled(
      totalRaw !== undefined && totalRaw !== null ? String(totalRaw) : null,
      1000,
    ) ??
    scaled(attr(el, "scoringResult") ?? attr(el, "totalScore"), 1000);
  if (total_score === null) {
    throw new Error(`scoring ${scoring_ai_id}: missing total_score`);
  }

  const guideMelodyRaw = attr(el, "guideMelody");

  return {
    dam_scoring_id: scoring_ai_id,
    scoring_type: inferScoringType(el),
    sung_at,
    song_title,
    song_artist,
    request_no: attr(el, "requestNo"),
    dam_contents_id: attr(el, "contentsId"),
    total_score,
    pitch_score: integer(attr(el, "radarChartPitch")),
    stability_score: integer(attr(el, "radarChartStability")),
    expression_score: integer(attr(el, "radarChartExpressive")),
    vibrato_longtone_score: integer(attr(el, "radarChartVibratoLongtone")),
    rhythm_score: integer(attr(el, "radarChartRhythm")),
    ai_bonus: scaled(attr(el, "aiSensitivityBonus"), 1000),
    key_control: integer(attr(el, "lastPerformKey")) ?? 0,
    tempo_control: integer(attr(el, "tempoControl")),
    guide_melody: guideMelodyRaw === null ? null : guideMelodyRaw === "1",
    singing_range_lowest: midi(attr(el, "singingRangeLowest")),
    singing_range_highest: midi(attr(el, "singingRangeHighest")),
    vocal_range_lowest: midi(attr(el, "vocalRangeLowest")),
    vocal_range_highest: midi(attr(el, "vocalRangeHighest")),
    pitch_intervals: parsePitchIntervals(el),
    raw_xml: el,
  };
}
