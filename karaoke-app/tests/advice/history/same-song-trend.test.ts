import { describe, expect, it } from "vitest";
import { evaluateSameSongTrend } from "@/lib/advice/rules/same-song-trend";
import { buildHistoryScore } from "./_history-helpers";

function makeSong(scores: number[]): ReturnType<typeof buildHistoryScore>[] {
  return scores.map((total, i) =>
    buildHistoryScore({
      id: `s${i}`,
      sung_at: `2026-04-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
      total_score: total,
    }),
  );
}

describe("R22 evaluateSameSongTrend", () => {
  it("returns [] without focusSongId", () => {
    expect(
      evaluateSameSongTrend({ scores: makeSong([85, 86, 87, 88, 89, 90, 91, 92, 93, 94]) }),
    ).toEqual([]);
  });

  it("needs at least 10 scores for the focus song", () => {
    expect(
      evaluateSameSongTrend({
        focusSongId: "song-A",
        scores: makeSong([85, 86, 87, 88, 89]), // only 5
      }),
    ).toEqual([]);
  });

  it("emits 'improving' info when recent 5 avg > prior 5 avg by 1+", () => {
    // prior 5 avg = 85, recent 5 avg = 91 → +6
    const r = evaluateSameSongTrend({
      focusSongId: "song-A",
      scores: makeSong([85, 85, 85, 85, 85, 91, 91, 91, 91, 91]),
    });
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R22.improving");
  });

  it("emits 'declining' tip when recent 5 avg < prior 5 avg by 1+", () => {
    const r = evaluateSameSongTrend({
      focusSongId: "song-A",
      scores: makeSong([91, 91, 91, 91, 91, 85, 85, 85, 85, 85]),
    });
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R22.declining");
  });

  it("stays silent when the delta is < 1 point", () => {
    const r = evaluateSameSongTrend({
      focusSongId: "song-A",
      scores: makeSong([89, 89, 89, 89, 89, 89.5, 89.5, 89.5, 89.5, 89.5]),
    });
    expect(r).toEqual([]);
  });
});
