import { describe, expect, it } from "vitest";
import {
  validateCdmCardNo,
  validateDisplayName,
} from "@/lib/validation/profile";

describe("validateDisplayName", () => {
  it("trims surrounding whitespace and returns the inner string", () => {
    expect(validateDisplayName("  shun  ")).toBe("shun");
  });

  it("accepts a single character", () => {
    expect(validateDisplayName("a")).toBe("a");
  });

  it("accepts exactly 40 characters", () => {
    const input = "x".repeat(40);
    expect(validateDisplayName(input)).toBe(input);
  });

  it("rejects empty string", () => {
    expect(() => validateDisplayName("")).toThrow(/表示名を入力/);
  });

  it("rejects whitespace-only string", () => {
    expect(() => validateDisplayName("   ")).toThrow(/表示名を入力/);
  });

  it("rejects 41-char input after trim", () => {
    expect(() => validateDisplayName("x".repeat(41))).toThrow(/40 文字以内/);
  });

  it("accepts a value that becomes 40 chars after trimming", () => {
    const input = `  ${"x".repeat(40)}  `;
    expect(validateDisplayName(input)).toBe("x".repeat(40));
  });
});

describe("validateCdmCardNo", () => {
  it("accepts a 20-char base64-like string (typical DAM cdmCardNo)", () => {
    const s = "abcdEFGH1234ijklMNOP";
    expect(validateCdmCardNo(s)).toBe(s);
  });

  it("accepts exactly 10 chars (lower bound)", () => {
    expect(validateCdmCardNo("a".repeat(10))).toBe("a".repeat(10));
  });

  it("accepts exactly 64 chars (upper bound)", () => {
    const s = "a".repeat(64);
    expect(validateCdmCardNo(s)).toBe(s);
  });

  it("rejects 9 chars", () => {
    expect(() => validateCdmCardNo("a".repeat(9))).toThrow(/10-64 文字/);
  });

  it("rejects 65 chars", () => {
    expect(() => validateCdmCardNo("a".repeat(65))).toThrow(/10-64 文字/);
  });

  it("trims before length-checking", () => {
    // 10 'a' padded with spaces — trims back to exactly 10 → accepted.
    expect(validateCdmCardNo(`   ${"a".repeat(10)}   `)).toBe("a".repeat(10));
  });

  it("rejects whitespace-only input (length 0 after trim)", () => {
    expect(() => validateCdmCardNo("     ")).toThrow(/10-64 文字/);
  });
});
