import { describe, expect, it } from "vitest";
import { validateSetlistMetaPatch } from "@/lib/validation/setlists";

describe("validateSetlistMetaPatch", () => {
  describe("name handling", () => {
    it("returns empty patch when name is not provided", () => {
      expect(validateSetlistMetaPatch({})).toEqual({});
    });

    it("trims name and includes it in the patch", () => {
      expect(validateSetlistMetaPatch({ name: "  My Setlist  " })).toEqual({
        name: "My Setlist",
      });
    });

    it("accepts exactly 80 chars", () => {
      const name = "x".repeat(80);
      expect(validateSetlistMetaPatch({ name })).toEqual({ name });
    });

    it("rejects empty name", () => {
      expect(() => validateSetlistMetaPatch({ name: "" })).toThrow(
        /セットリスト名を入力/,
      );
    });

    it("rejects whitespace-only name", () => {
      expect(() => validateSetlistMetaPatch({ name: "   " })).toThrow(
        /セットリスト名を入力/,
      );
    });

    it("rejects 81-char name", () => {
      expect(() =>
        validateSetlistMetaPatch({ name: "x".repeat(81) }),
      ).toThrow(/80 文字以内/);
    });
  });

  describe("scheduledFor handling", () => {
    it("omits scheduled_for when the key is absent", () => {
      const patch = validateSetlistMetaPatch({ name: "A" });
      expect(patch).not.toHaveProperty("scheduled_for");
    });

    it("accepts a well-formed date", () => {
      expect(
        validateSetlistMetaPatch({ scheduledFor: "2026-05-01" }),
      ).toEqual({
        scheduled_for: "2026-05-01",
      });
    });

    it("treats explicit null as a clear", () => {
      expect(validateSetlistMetaPatch({ scheduledFor: null })).toEqual({
        scheduled_for: null,
      });
    });

    it("treats empty string as a clear", () => {
      expect(validateSetlistMetaPatch({ scheduledFor: "" })).toEqual({
        scheduled_for: null,
      });
    });

    it("rejects partial / locale-formatted dates", () => {
      for (const bad of [
        "2026-5-1",
        "26-05-01",
        "2026/05/01",
        "May 1, 2026",
        "2026-05-01T00:00:00Z",
      ]) {
        expect(() =>
          validateSetlistMetaPatch({ scheduledFor: bad }),
        ).toThrow(/YYYY-MM-DD/);
      }
    });

    // NOTE: regex is shape-only (4-2-2 digits). It does not semantically
    // validate that the date is real — "2026-13-32" passes. This is an
    // acceptable tradeoff: Postgres rejects impossible dates on insert,
    // surfacing the error to the user via the DB error path.
    it("accepts syntactically-valid but semantically-wrong dates (known limitation)", () => {
      expect(
        validateSetlistMetaPatch({ scheduledFor: "2026-13-32" }),
      ).toEqual({
        scheduled_for: "2026-13-32",
      });
    });
  });

  describe("combined input", () => {
    it("merges both fields into the patch", () => {
      expect(
        validateSetlistMetaPatch({
          name: "Friday Night",
          scheduledFor: "2026-05-01",
        }),
      ).toEqual({
        name: "Friday Night",
        scheduled_for: "2026-05-01",
      });
    });
  });
});
