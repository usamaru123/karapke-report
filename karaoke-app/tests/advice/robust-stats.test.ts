import { describe, expect, it } from "vitest";
import { median, takeRecent, trimmedMean } from "@/lib/advice/robust-stats";

describe("trimmedMean", () => {
  it("returns null for empty", () => {
    expect(trimmedMean([])).toBeNull();
  });

  it("returns the single value for length 1", () => {
    expect(trimmedMean([87])).toBe(87);
  });

  it("averages 2 values without trimming (N <= 2 fallback)", () => {
    expect(trimmedMean([90, 80])).toBe(85);
  });

  it("drops 1 from each end for N = 5 (keep middle 3)", () => {
    // sorted: [60, 80, 85, 90, 95] → keep [80, 85, 90] → mean 85
    expect(trimmedMean([85, 95, 60, 80, 90])).toBeCloseTo(85, 5);
  });

  it("drops 2 from each end for N = 10 (keep middle 6)", () => {
    // sorted: [50, 60, 70, 75, 80, 85, 90, 92, 95, 100]
    // keep [70, 75, 80, 85, 90, 92] → mean 82
    expect(
      trimmedMean([90, 85, 60, 70, 75, 80, 92, 95, 100, 50]),
    ).toBeCloseTo(82, 5);
  });

  it("rejects a single extreme outlier", () => {
    // sorted: [30, 89, 90, 91, 92] — 30 is an outlier
    // trim drops 30 and 92 → keep [89, 90, 91] → mean 90
    expect(trimmedMean([90, 30, 89, 92, 91])).toBeCloseTo(90, 5);
  });

  it("ignores NaN / Infinity values silently", () => {
    expect(
      trimmedMean([90, 80, 85, Number.NaN, Number.POSITIVE_INFINITY]),
    ).toBeCloseTo(85, 5);
  });
});

describe("median", () => {
  it("returns null for empty", () => {
    expect(median([])).toBeNull();
  });

  it("handles odd-length", () => {
    expect(median([5, 3, 1])).toBe(3);
  });

  it("handles even-length by averaging the middle two", () => {
    expect(median([10, 20, 30, 40])).toBe(25);
  });

  it("is robust to outliers", () => {
    expect(median([90, 91, 92, 93, 1000])).toBe(92);
  });
});

describe("takeRecent", () => {
  type Row = { id: string; ts: string };

  it("returns up to N newest by timestamp", () => {
    const rows: Row[] = [
      { id: "a", ts: "2026-01-01" },
      { id: "b", ts: "2026-03-01" },
      { id: "c", ts: "2026-02-01" },
    ];
    const got = takeRecent(rows, 2, (r) => r.ts);
    expect(got.map((r) => r.id)).toEqual(["b", "c"]);
  });

  it("returns everything when arr.length <= n", () => {
    const rows: Row[] = [{ id: "x", ts: "2026-01-01" }];
    expect(takeRecent(rows, 5, (r) => r.ts)).toEqual(rows);
  });

  it("does not mutate the input array", () => {
    const rows: Row[] = [
      { id: "a", ts: "2026-01-01" },
      { id: "b", ts: "2026-03-01" },
    ];
    const snapshot = [...rows];
    takeRecent(rows, 1, (r) => r.ts);
    expect(rows).toEqual(snapshot);
  });
});
