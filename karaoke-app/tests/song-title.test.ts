import { describe, expect, it } from "vitest";
import {
  canonicalTitleKey,
  stripVersionMarkers,
} from "@/lib/song-title";

describe("stripVersionMarkers", () => {
  it("strips (プロオケ) and (生音) together", () => {
    expect(stripVersionMarkers("ビンテージ (プロオケ)(生音)")).toBe("ビンテージ");
  });

  it("handles full-width parens", () => {
    expect(stripVersionMarkers("アルエ（オリジナル)(生音)")).toBe("アルエ");
    expect(stripVersionMarkers("楓（ガイドメロディ）")).toBe("楓");
  });

  it("is case-insensitive for English markers", () => {
    expect(stripVersionMarkers("Let It Go (Original Karaoke)")).toBe(
      "Let It Go",
    );
    expect(stripVersionMarkers("Let It Go (ORIGINAL KARAOKE)")).toBe(
      "Let It Go",
    );
  });

  it("preserves non-marker parenthetical content", () => {
    // This is a real title — we should NOT strip it.
    expect(stripVersionMarkers("Song (English Version)")).toBe(
      "Song (English Version)",
    );
  });

  it("strips multiple markers independent of order", () => {
    expect(stripVersionMarkers("Song (Live) (Remix)")).toBe("Song");
    expect(stripVersionMarkers("Song (Remix) (Live)")).toBe("Song");
  });

  it("handles extra whitespace around markers", () => {
    expect(stripVersionMarkers("Song  (  プロオケ  )")).toBe("Song");
  });

  it("returns the title unchanged when no marker is present", () => {
    expect(stripVersionMarkers("ビンテージ")).toBe("ビンテージ");
    expect(stripVersionMarkers("Hello World")).toBe("Hello World");
  });
});

describe("canonicalTitleKey", () => {
  it("lowercases, strips markers, and trims", () => {
    expect(canonicalTitleKey("  Let It Go (Original Karaoke)  ")).toBe(
      "let it go",
    );
  });

  it("produces the same key for matching versions", () => {
    const a = canonicalTitleKey("ビンテージ (プロオケ)(生音)");
    const b = canonicalTitleKey("ビンテージ");
    const c = canonicalTitleKey("ビンテージ (生音)");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("keeps genuinely different titles distinct", () => {
    expect(canonicalTitleKey("Song A (Live)")).not.toBe(
      canonicalTitleKey("Song B (Live)"),
    );
  });
});
