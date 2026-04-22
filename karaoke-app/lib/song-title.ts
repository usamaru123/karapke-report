/**
 * Pure helpers for DAM song-title normalization.
 *
 * DAM's `contentsName` often embeds version markers in parentheses, e.g.
 *   "ビンテージ (プロオケ)(生音)"
 *   "大丈夫 (Original Karaoke)"
 *   "楓 (ガイドメロディ)"
 *   "アルエ（オリジナル)(生音)"  (note: full-width parens also appear)
 *
 * Without normalization these end up as distinct `songs` rows, splitting the
 * user's history by incidental mix variant. This module canonicalizes the
 * title (for deduping / matching) while **preserving** the raw title for UI.
 *
 * Pure functions — same input → same output, no I/O.
 */

// Markers we strip. Case-insensitive; half / full-width parens AND brackets
// ([…] / ［…］) are both recognised because DAM uses either form depending on
// the field (`contentsName` → parens, `dContentsName` → brackets).
const VERSION_MARKERS = [
  "プロオケ",
  "生音",
  "良音",
  "ガイドメロディ",
  "ガイド",
  "オリジナル",
  "Original",
  "Original Karaoke",
  "Karaoke",
  "Live",
  "ライブ",
  "アコースティック",
  "Acoustic",
  "Remix",
  "Instrumental",
  "Inst",
  "カバー",
  "Cover",
] as const;

/**
 * Strip recognized version markers wrapped in () / （） / [] / ［］.
 * Returns the canonical title, preserving the original casing / spacing of
 * the song portion. Runs one regex per marker so legit parenthetical content
 * (e.g. "Song (English Version)") is left intact.
 */
export function stripVersionMarkers(title: string): string {
  let out = title;
  for (const marker of VERSION_MARKERS) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `\\s*[\\(（\\[［]\\s*${escaped}\\s*[\\)）\\]］]`,
      "gi",
    );
    out = out.replace(pattern, "");
  }
  return out.trim();
}

/**
 * The *matching key* for a song title: lowercase + version-stripped + trimmed.
 * Used for deduplication at insert time. Mirrors the behavior of the STORED
 * `title_normalized` column, but version-aware.
 */
export function canonicalTitleKey(title: string): string {
  return stripVersionMarkers(title).toLowerCase().trim();
}
