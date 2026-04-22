/**
 * Pure validator for setlist metadata updates. `validateSetlistMetaPatch`
 * returns the patch object that will be applied to the DB row, or throws if
 * the input is invalid. Kept side-effect-free so it can be unit-tested.
 */

export type SetlistMetaInput = {
  name?: string;
  /** yyyy-MM-dd, empty string, or null (null/empty means clear). */
  scheduledFor?: string | null;
};

export type SetlistMetaPatch = {
  name?: string;
  scheduled_for?: string | null;
};

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export function validateSetlistMetaPatch(
  input: SetlistMetaInput,
): SetlistMetaPatch {
  const patch: SetlistMetaPatch = {};

  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (trimmed.length === 0) {
      throw new Error("セットリスト名を入力してください");
    }
    if (trimmed.length > 80) {
      throw new Error("セットリスト名は 80 文字以内にしてください");
    }
    patch.name = trimmed;
  }

  if (input.scheduledFor !== undefined) {
    // Treat null / empty as "clear the scheduled date" so the UI can delete
    // a previously-set value. Any other value must match YYYY-MM-DD exactly
    // — we reject partial or locale-formatted dates to avoid silently
    // storing garbage.
    if (input.scheduledFor === null || input.scheduledFor === "") {
      patch.scheduled_for = null;
    } else {
      if (!YYYY_MM_DD.test(input.scheduledFor)) {
        throw new Error("開催予定日の形式が不正です (YYYY-MM-DD)");
      }
      patch.scheduled_for = input.scheduledFor;
    }
  }

  return patch;
}
