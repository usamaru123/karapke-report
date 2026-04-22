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

// Markers we strip. Case-insensitive; half / full-width parens both allowed.
const VERSION_MARKERS = [
  "プロオケ",
  "生音",
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
 * Strip recognized version markers in (…) / （…）. Returns the canonical
 * title, preserving the original casing / spacing of the song portion.
 */
export function stripVersionMarkers(title: string): string {
  let out = title;
  // Match both half-width and full-width parentheses wrapping any of the markers.
  // We rebuild with a single regex per-marker so we don't accidentally strip
  // legit parenthetical content like "(English Version)" of a song title.
  for (const marker of VERSION_MARKERS) {
    // Escape regex specials in the marker, then allow optional leading/trailing whitespace.
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `\\s*[\\(（]\\s*${escaped}\\s*[\\)）]`,
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
