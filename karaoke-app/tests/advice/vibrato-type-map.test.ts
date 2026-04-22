import { describe, expect, it } from "vitest";
import {
  describeVibratoType,
  resolveVibratoType,
} from "@/lib/advice/vibrato-type-map";

describe("resolveVibratoType", () => {
  it("resolves each of the 15 known codes", () => {
    const expectations = [
      [0, "N"],
      [1, "A-1"],
      [2, "A-2"],
      [3, "A-3"],
      [4, "B-1"],
      [5, "B-2"],
      [6, "B-3"],
      [7, "C-1"],
      [8, "C-2"],
      [9, "C-3"],
      [10, "D"],
      [11, "E"],
      [12, "F"],
      [13, "G"],
      [14, "H"],
    ] as const;
    for (const [code, label] of expectations) {
      expect(resolveVibratoType(code)?.label).toBe(label);
    }
  });

  it("marks B-3 and C-3 as recommended, others not", () => {
    expect(resolveVibratoType(6)?.isRecommended).toBe(true);
    expect(resolveVibratoType(9)?.isRecommended).toBe(true);
    expect(resolveVibratoType(1)?.isRecommended).toBe(false);
    expect(resolveVibratoType(10)?.isRecommended).toBe(false);
    expect(resolveVibratoType(0)?.isRecommended).toBe(false);
  });

  it("classifies period by row (A=short, B=medium, C=long, D-H=non-box, N=none)", () => {
    expect(resolveVibratoType(1)?.period).toBe("short");
    expect(resolveVibratoType(3)?.period).toBe("short");
    expect(resolveVibratoType(4)?.period).toBe("medium");
    expect(resolveVibratoType(6)?.period).toBe("medium");
    expect(resolveVibratoType(9)?.period).toBe("long");
    expect(resolveVibratoType(10)?.period).toBe("non-box");
    expect(resolveVibratoType(14)?.period).toBe("non-box");
    expect(resolveVibratoType(0)?.period).toBe("none");
  });

  it("classifies depth 1/2/3 for A/B/C rows, null for D-H and N", () => {
    expect(resolveVibratoType(1)?.depth).toBe(1);
    expect(resolveVibratoType(6)?.depth).toBe(3);
    expect(resolveVibratoType(10)?.depth).toBeNull();
    expect(resolveVibratoType(0)?.depth).toBeNull();
  });

  it("returns null for unknown codes (15+, negative, fractional)", () => {
    expect(resolveVibratoType(15)).toBeNull();
    expect(resolveVibratoType(99)).toBeNull();
    expect(resolveVibratoType(-1)).toBeNull();
    expect(resolveVibratoType(null)).toBeNull();
    expect(resolveVibratoType(Number.NaN)).toBeNull();
    expect(resolveVibratoType(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("truncates fractional codes before lookup", () => {
    expect(resolveVibratoType(6.7)?.label).toBe("B-3");
    expect(resolveVibratoType(9.99)?.label).toBe("C-3");
  });
});

describe("describeVibratoType", () => {
  it("gives a short label for each box-type", () => {
    expect(describeVibratoType(6)).toContain("B-3");
    expect(describeVibratoType(6)).toContain("高得点帯");
    expect(describeVibratoType(6)).toContain("中");
    expect(describeVibratoType(6)).toContain("深");
  });

  it("notes non-box types as box-failure suspects", () => {
    expect(describeVibratoType(13)).toContain("G");
    expect(describeVibratoType(13)).toContain("非ボックス型");
  });

  it("describes N as ノンビブ", () => {
    expect(describeVibratoType(0)).toContain("ノンビブ");
  });

  it("returns '未計測' for null", () => {
    expect(describeVibratoType(null)).toBe("未計測");
  });

  it("returns a debug string for unknown codes", () => {
    expect(describeVibratoType(99)).toContain("code=99");
  });

  it("does NOT mark A-1 as recommended even though it's present", () => {
    expect(describeVibratoType(1)).not.toContain("高得点帯");
  });
});
