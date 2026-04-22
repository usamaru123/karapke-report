import { describe, expect, it } from "vitest";
import {
  formatSyncDuration,
  getSyncStatusMeta,
} from "@/lib/format/sync-log";

describe("getSyncStatusMeta", () => {
  it("maps success → green check", () => {
    expect(getSyncStatusMeta("success")).toEqual({
      colorClass: "text-neon-green",
      label: "成功",
      iconKey: "check",
    });
  });

  it("maps failed → red alert", () => {
    expect(getSyncStatusMeta("failed")).toEqual({
      colorClass: "text-red-400",
      label: "失敗",
      iconKey: "alert",
    });
  });

  it("maps running → cyan clock", () => {
    expect(getSyncStatusMeta("running")).toEqual({
      colorClass: "text-neon-cyan",
      label: "実行中",
      iconKey: "clock",
    });
  });

  it("maps no_card_no → amber alert with dedicated label", () => {
    expect(getSyncStatusMeta("no_card_no")).toEqual({
      colorClass: "text-neon-amber",
      label: "カード番号未登録",
      iconKey: "alert",
    });
  });

  it("falls back to neutral clock + raw label for unknown status", () => {
    expect(getSyncStatusMeta("unexpected_future_status")).toEqual({
      colorClass: "text-white/60",
      label: "unexpected_future_status",
      iconKey: "clock",
    });
  });
});

describe("formatSyncDuration", () => {
  it("returns '—' when finishedAt is null (still running)", () => {
    expect(formatSyncDuration("2026-04-22T00:00:00Z", null)).toBe("—");
  });

  it("returns '—' when the delta is negative (clock skew / arg swap)", () => {
    expect(
      formatSyncDuration("2026-04-22T00:00:05Z", "2026-04-22T00:00:00Z"),
    ).toBe("—");
  });

  it("returns '—' when inputs are unparseable", () => {
    expect(formatSyncDuration("not-a-date", "also-bad")).toBe("—");
  });

  it("formats sub-second durations in ms", () => {
    expect(
      formatSyncDuration(
        "2026-04-22T00:00:00.000Z",
        "2026-04-22T00:00:00.250Z",
      ),
    ).toBe("250 ms");
  });

  it("formats durations under 1 minute with 1 decimal second", () => {
    expect(
      formatSyncDuration(
        "2026-04-22T00:00:00.000Z",
        "2026-04-22T00:00:12.340Z",
      ),
    ).toBe("12.3 秒");
  });

  it("formats multi-minute durations as '<m> 分 <s> 秒'", () => {
    expect(
      formatSyncDuration(
        "2026-04-22T00:00:00Z",
        "2026-04-22T00:02:37Z",
      ),
    ).toBe("2 分 37 秒");
  });

  it("rounds seconds within minute-grouped formatting", () => {
    // 65 seconds = 1 min 5 sec (not 1.0833...)
    expect(
      formatSyncDuration(
        "2026-04-22T00:00:00Z",
        "2026-04-22T00:01:05Z",
      ),
    ).toBe("1 分 5 秒");
  });

  it("handles exactly 1 second as '1.0 秒' (boundary)", () => {
    expect(
      formatSyncDuration(
        "2026-04-22T00:00:00.000Z",
        "2026-04-22T00:00:01.000Z",
      ),
    ).toBe("1.0 秒");
  });

  it("handles exactly 60 seconds crossing the minute boundary", () => {
    expect(
      formatSyncDuration(
        "2026-04-22T00:00:00Z",
        "2026-04-22T00:01:00Z",
      ),
    ).toBe("1 分 0 秒");
  });
});
