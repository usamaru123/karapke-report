import { describe, expect, it } from "vitest";
import { midiToNoteName, midiToPercent } from "@/lib/midi";

describe("midiToNoteName", () => {
  it("returns '—' for null / undefined / NaN", () => {
    expect(midiToNoteName(null)).toBe("—");
    expect(midiToNoteName(undefined)).toBe("—");
    expect(midiToNoteName(Number.NaN)).toBe("—");
  });

  it("maps standard reference pitches", () => {
    // MIDI 60 = middle C = C4 per convention the module documents.
    expect(midiToNoteName(60)).toBe("C4");
    expect(midiToNoteName(48)).toBe("C3");
    expect(midiToNoteName(72)).toBe("C5");
  });

  it("maps sharps and range extremes", () => {
    expect(midiToNoteName(61)).toBe("C#4");
    expect(midiToNoteName(69)).toBe("A4"); // concert A
    expect(midiToNoteName(36)).toBe("C2"); // bar lower bound
    expect(midiToNoteName(84)).toBe("C6"); // bar upper bound
  });
});

describe("midiToPercent", () => {
  it("maps the lower bound to 0 and the upper bound to 100", () => {
    expect(midiToPercent(36, 36, 84)).toBe(0);
    expect(midiToPercent(84, 36, 84)).toBe(100);
  });

  it("maps midpoint proportionally", () => {
    expect(midiToPercent(60, 36, 84)).toBeCloseTo(50, 5);
  });

  it("clamps below the lower bound to 0", () => {
    expect(midiToPercent(12, 36, 84)).toBe(0);
  });

  it("clamps above the upper bound to 100", () => {
    expect(midiToPercent(120, 36, 84)).toBe(100);
  });

  it("returns 0 when the range is degenerate (max <= min)", () => {
    expect(midiToPercent(50, 60, 60)).toBe(0);
    expect(midiToPercent(50, 70, 60)).toBe(0);
  });
});
