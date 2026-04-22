import { describe, expect, it } from "vitest";
import { evaluateSongGap } from "@/lib/advice/rules/song-gap";
import { buildHistoryScore } from "./_history-helpers";

describe("R24 evaluateSongGap", () => {
  it("fires when top song - bottom song >= 10 across 4+ songs", () => {
    const scores = [
      buildHistoryScore({ id: "1", song_id: "A", song_title: "A", total_score: 95 }),
      buildHistoryScore({ id: "2", song_id: "B", song_title: "B", total_score: 90 }),
      buildHistoryScore({ id: "3", song_id: "C", song_title: "C", total_score: 85 }),
      buildHistoryScore({ id: "4", song_id: "D", song_title: "D", total_score: 80 }),
    ];
    const r = evaluateSongGap({ scores });
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R24.song_gap");
    expect(r[0].metrics.gap).toBeCloseTo(15, 1);
  });

  it("does NOT fire with fewer than 4 distinct songs", () => {
    const scores = [
      buildHistoryScore({ id: "1", song_id: "A", song_title: "A", total_score: 95 }),
      buildHistoryScore({ id: "2", song_id: "B", song_title: "B", total_score: 80 }),
      buildHistoryScore({ id: "3", song_id: "C", song_title: "C", total_score: 85 }),
    ];
    expect(evaluateSongGap({ scores })).toEqual([]);
  });

  it("does NOT fire when gap is small", () => {
    const scores = [
      buildHistoryScore({ id: "1", song_id: "A", song_title: "A", total_score: 90 }),
      buildHistoryScore({ id: "2", song_id: "B", song_title: "B", total_score: 88 }),
      buildHistoryScore({ id: "3", song_id: "C", song_title: "C", total_score: 85 }),
      buildHistoryScore({ id: "4", song_id: "D", song_title: "D", total_score: 84 }),
    ];
    expect(evaluateSongGap({ scores })).toEqual([]);
  });

  it("uses per-song best, not raw scores", () => {
    // Song A has one bad attempt but a great attempt — best should be 95.
    const scores = [
      buildHistoryScore({ id: "1", song_id: "A", song_title: "A", total_score: 60 }),
      buildHistoryScore({ id: "2", song_id: "A", song_title: "A", total_score: 95 }),
      buildHistoryScore({ id: "3", song_id: "B", song_title: "B", total_score: 85 }),
      buildHistoryScore({ id: "4", song_id: "C", song_title: "C", total_score: 82 }),
      buildHistoryScore({ id: "5", song_id: "D", song_title: "D", total_score: 80 }),
    ];
    const r = evaluateSongGap({ scores });
    expect(r[0].metrics.top_best).toBe(95);
    expect(r[0].metrics.bottom_best).toBe(80);
  });
});
