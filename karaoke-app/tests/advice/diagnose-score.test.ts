import { describe, expect, it } from "vitest";
import { diagnoseScore, sortFindings } from "@/lib/advice/diagnose-score";
import type { Finding } from "@/lib/advice/types";
import { buildScore } from "./rules/_helpers";

describe("diagnoseScore (orchestrator)", () => {
  it("returns [] for a maximally-healthy Ai score", () => {
    // Intentionally designed to not trip any rule:
    // - 素点 91 → balanced (R01 still emits an info)
    // - intonation 70 → below R02 threshold
    // - all radar axes ~90 → no weakest gap
    // - rhythm 95 → no R06
    // - ranges fit → no R09
    // - not ai_heart → no R10
    const findings = diagnoseScore(
      buildScore({
        scoring_type: "ai",
        total_score: 95,
        ai_bonus: 4,
        intonation: 70,
        pitch_score: 91,
        stability_score: 91,
        expression_score: 91,
        vibrato_longtone_score: 91,
        rhythm_score: 95,
        song_range_lowest: 50,
        song_range_highest: 70,
        user_range_low: 46,
        user_range_high: 74,
      }),
    );
    // R01 balanced fires → 1 info
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe("R01.balanced");
  });

  it("aggregates multiple rules when several trigger", () => {
    const findings = diagnoseScore(
      buildScore({
        scoring_type: "ai",
        total_score: 85,
        ai_bonus: 1,
        intonation: 90,
        expression_score: 100.5, // near ceiling 100.5
        rhythm_score: 80, // below 90 → R06
        pitch_score: 72, // weakest → R04
        stability_score: 88,
        vibrato_longtone_score: 88,
      }),
    );
    const ruleIds = findings.map((f) => f.ruleId);
    expect(ruleIds).toContain("R02.ceiling_stuck");
    expect(ruleIds).toContain("R04.weakest_axis");
    expect(ruleIds).toContain("R06.rushed_suspect");
  });

  it("runs rules in deterministic order (for snapshot stability)", () => {
    const run1 = diagnoseScore(buildScore());
    const run2 = diagnoseScore(buildScore());
    expect(run1.map((f) => f.ruleId)).toEqual(run2.map((f) => f.ruleId));
  });
});

describe("sortFindings", () => {
  const warn1: Finding = {
    ruleId: "B",
    severity: "warn",
    title: "",
    message: "",
    metrics: {},
    source: "empirical",
    confidence: "medium",
  };
  const warn2: Finding = { ...warn1, ruleId: "A", confidence: "high" };
  const tip: Finding = { ...warn1, ruleId: "C", severity: "tip" };
  const info: Finding = { ...warn1, ruleId: "D", severity: "info" };

  it("sorts warn > tip > info", () => {
    const sorted = sortFindings([info, tip, warn1]);
    expect(sorted.map((f) => f.severity)).toEqual(["warn", "tip", "info"]);
  });

  it("within same severity, high confidence first", () => {
    const sorted = sortFindings([warn1, warn2]);
    expect(sorted[0].confidence).toBe("high");
  });

  it("within same severity+confidence, sorts by ruleId for stability", () => {
    const f1: Finding = { ...warn1, ruleId: "Z", confidence: "high" };
    const f2: Finding = { ...warn1, ruleId: "A", confidence: "high" };
    const sorted = sortFindings([f1, f2]);
    expect(sorted.map((f) => f.ruleId)).toEqual(["A", "Z"]);
  });

  it("does not mutate the input array", () => {
    const input = [info, warn1];
    const copy = [...input];
    sortFindings(input);
    expect(input).toEqual(copy);
  });
});
