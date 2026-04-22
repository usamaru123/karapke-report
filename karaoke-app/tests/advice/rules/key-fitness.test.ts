import { describe, expect, it } from "vitest";
import { evaluateKeyFitness } from "@/lib/advice/rules/key-fitness";
import { buildScore } from "./_helpers";

describe("R09 evaluateKeyFitness", () => {
  it("emits 'key_tweak' tip when verdict is key_tweak", () => {
    // user 48..72, song 48..74 → highMargin = -2 → key_tweak / too_high
    const r = evaluateKeyFitness(
      buildScore({
        song_range_lowest: 48,
        song_range_highest: 74,
        user_range_low: 48,
        user_range_high: 72,
      }),
    );
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R09.key_tweak");
    expect(r[0].severity).toBe("tip");
    expect(r[0].message).toContain("高音側");
  });

  it("emits 'key_hard' warn when verdict is hard", () => {
    // song way above user range → hard
    const r = evaluateKeyFitness(
      buildScore({
        song_range_lowest: 48,
        song_range_highest: 85,
        user_range_low: 48,
        user_range_high: 72,
      }),
    );
    expect(r).toHaveLength(1);
    expect(r[0].ruleId).toBe("R09.key_hard");
    expect(r[0].severity).toBe("warn");
  });

  it("returns [] when verdict is 'fits'", () => {
    const r = evaluateKeyFitness(
      buildScore({
        song_range_lowest: 50,
        song_range_highest: 70,
        user_range_low: 46,
        user_range_high: 74,
      }),
    );
    expect(r).toEqual([]);
  });

  it("returns [] when user range is unknown", () => {
    const r = evaluateKeyFitness(
      buildScore({
        user_range_low: null,
        user_range_high: null,
      }),
    );
    expect(r).toEqual([]);
  });

  it("returns [] when song range is unknown", () => {
    const r = evaluateKeyFitness(
      buildScore({
        song_range_lowest: null,
        song_range_highest: null,
      }),
    );
    expect(r).toEqual([]);
  });

  it("mentions '両端' when both ends breach", () => {
    // song 40..85, user 50..70 → both breached
    const r = evaluateKeyFitness(
      buildScore({
        song_range_lowest: 40,
        song_range_highest: 85,
        user_range_low: 50,
        user_range_high: 70,
      }),
    );
    expect(r[0].message).toContain("両端");
  });
});
