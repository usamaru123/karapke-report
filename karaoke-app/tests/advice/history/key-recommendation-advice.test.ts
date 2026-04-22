import { describe, expect, it } from "vitest";
import { evaluateKeyRecommendationAdvice } from "@/lib/advice/rules/key-recommendation-advice";
import { buildHistoryScore } from "./_history-helpers";

describe("R20 evaluateKeyRecommendationAdvice", () => {
  it("returns [] without focusSongId", () => {
    expect(
      evaluateKeyRecommendationAdvice({
        scores: [
          buildHistoryScore({ id: "1", key_control: 0, total_score: 90 }),
          buildHistoryScore({ id: "2", key_control: 0, total_score: 91 }),
          buildHistoryScore({ id: "3", key_control: 0, total_score: 92 }),
        ],
      }),
    ).toEqual([]);
  });

  it("returns [] when fewer than 3 scores for the focus song", () => {
    expect(
      evaluateKeyRecommendationAdvice({
        focusSongId: "song-A",
        scores: [
          buildHistoryScore({ id: "1", key_control: 0 }),
          buildHistoryScore({ id: "2", key_control: 0 }),
        ],
      }),
    ).toEqual([]);
  });

  it("recommends the highest-avg key once it has >= 2 samples", () => {
    const r = evaluateKeyRecommendationAdvice({
      focusSongId: "song-A",
      scores: [
        buildHistoryScore({ id: "1", key_control: 0, total_score: 85 }),
        buildHistoryScore({ id: "2", key_control: 0, total_score: 86 }),
        buildHistoryScore({ id: "3", key_control: -2, total_score: 93 }),
        buildHistoryScore({ id: "4", key_control: -2, total_score: 94 }),
      ],
    });
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R20.best_key");
    expect(r[0].metrics.best_key).toBe(-2);
  });

  it("filters to the focus song only", () => {
    const r = evaluateKeyRecommendationAdvice({
      focusSongId: "song-A",
      scores: [
        buildHistoryScore({
          id: "1",
          song_id: "song-B",
          key_control: 5,
          total_score: 99,
        }),
        buildHistoryScore({
          id: "2",
          song_id: "song-B",
          key_control: 5,
          total_score: 99,
        }),
        buildHistoryScore({ id: "3", key_control: 0, total_score: 85 }),
        buildHistoryScore({ id: "4", key_control: 0, total_score: 86 }),
        buildHistoryScore({ id: "5", key_control: 0, total_score: 87 }),
      ],
    });
    expect(r[0].metrics.best_key).toBe(0);
  });
});
