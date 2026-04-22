import { describe, expect, it } from "vitest";
import { buildScoreInput } from "@/lib/advice/build-score-input";
import type { Score, Song } from "@/types/domain";

function baseScore(overrides: Partial<Score> = {}): Score {
  return {
    id: "score-1",
    user_id: "user-1",
    song_id: "song-1",
    session_id: null,
    scoring_type: "ai",
    dam_scoring_id: "dam-1",
    sung_at: "2026-04-20T10:00:00Z",
    total_score: 90.5,
    pitch_score: 85,
    stability_score: 83,
    expression_score: 82,
    vibrato_longtone_score: 75,
    rhythm_score: 95,
    ai_bonus: 3.7,
    intonation: 78,
    key_control: 0,
    tempo_control: null,
    guide_melody: null,
    singing_range_lowest: 50,
    singing_range_highest: 72,
    vocal_range_lowest: 50,
    vocal_range_highest: 72,
    raw_xml: { scoring: {} },
    created_at: "2026-04-20T10:00:01Z",
    ...overrides,
  } as Score;
}

function baseSong(overrides: Partial<Song> = {}): Song {
  return {
    id: "song-1",
    title: "t",
    title_normalized: "t",
    artist: "a",
    artist_normalized: "a",
    request_no: null,
    dam_contents_id: null,
    vocal_range_lowest: 48,
    vocal_range_highest: 74,
    range_source: null,
    range_updated_at: null,
    duration_sec: null,
    genre: null,
    created_at: "2026-04-20T10:00:00Z",
    updated_at: "2026-04-20T10:00:00Z",
    ...overrides,
  } as Song;
}

describe("buildScoreInput", () => {
  it("assembles a complete ScoreInput from typical rows", () => {
    const si = buildScoreInput(
      baseScore(),
      baseSong(),
      { low: 46, high: 76, sampleSize: 10 },
    );
    expect(si).toMatchObject({
      id: "score-1",
      scoring_type: "ai",
      total_score: 90.5,
      intonation: 78,
      song_range_lowest: 48,
      song_range_highest: 74,
      user_range_low: 46,
      user_range_high: 76,
    });
  });

  it("coerces stringified NUMERIC columns (Supabase quirk)", () => {
    // Supabase returns NUMERIC as strings in some configs. Rules expect number.
    const si = buildScoreInput(
      baseScore({
        total_score: "92.133" as unknown as number,
        ai_bonus: "4.501" as unknown as number,
      }),
      baseSong(),
      { low: null, high: null, sampleSize: 0 },
    );
    expect(si.total_score).toBeCloseTo(92.133, 3);
    expect(si.ai_bonus).toBeCloseTo(4.501, 3);
  });

  it("preserves null for optional fields", () => {
    const si = buildScoreInput(
      baseScore({
        ai_bonus: null,
        intonation: null,
        pitch_score: null,
        singing_range_lowest: null,
        singing_range_highest: null,
      }),
      baseSong({ vocal_range_lowest: null, vocal_range_highest: null }),
      { low: null, high: null, sampleSize: 0 },
    );
    expect(si.ai_bonus).toBeNull();
    expect(si.intonation).toBeNull();
    expect(si.pitch_score).toBeNull();
    expect(si.song_range_lowest).toBeNull();
    expect(si.song_range_highest).toBeNull();
    expect(si.user_range_low).toBeNull();
    expect(si.user_range_high).toBeNull();
  });

  it("defaults key_control to 0 when the DB value is missing", () => {
    const si = buildScoreInput(
      baseScore({ key_control: null as unknown as number }),
      baseSong(),
      { low: 48, high: 72, sampleSize: 5 },
    );
    expect(si.key_control).toBe(0);
  });

  it("treats empty-string numerics as null", () => {
    const si = buildScoreInput(
      baseScore({
        ai_bonus: "" as unknown as number,
        intonation: "" as unknown as number,
      }),
      baseSong(),
      { low: null, high: null, sampleSize: 0 },
    );
    expect(si.ai_bonus).toBeNull();
    expect(si.intonation).toBeNull();
  });
});
