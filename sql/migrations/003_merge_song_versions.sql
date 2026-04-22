-- ============================================================================
-- Migration 003: Merge song version duplicates (プロオケ / 生音 など)
-- ============================================================================
--
-- DAM returns `contentsName` embedded with version markers like
-- "ビンテージ (プロオケ)(生音)". Without normalization these create separate
-- `songs` rows, fragmenting the user's history. The parser now strips these
-- markers before upsert — this migration fixes the existing rows.
--
-- DESTRUCTIVE. Take a Supabase DB snapshot before running. Idempotent on
-- re-run (once merged, finds 0 groups and exits cleanly).
-- ============================================================================

BEGIN;

-- Keeper → loser mapping. The keeper is the row whose title, once stripped,
-- is shortest (so we prefer already-canonical rows), breaking ties by
-- oldest `created_at` for stability.
CREATE TEMP TABLE song_merge_map ON COMMIT DROP AS
WITH canon AS (
  SELECT
    id, title, artist, created_at,
    regexp_replace(title,
      '\s*[\(（]\s*(プロオケ|生音|ガイドメロディ|ガイド|オリジナル|Original Karaoke|Original|Karaoke|Live|ライブ|アコースティック|Acoustic|Remix|Instrumental|Inst|カバー|Cover)\s*[\)）]',
      '', 'gi') AS canonical_title
  FROM songs
),
grouped AS (
  SELECT ARRAY_AGG(id ORDER BY length(title) ASC, created_at ASC) AS ids
  FROM canon
  GROUP BY LOWER(TRIM(canonical_title)), LOWER(TRIM(artist))
  HAVING COUNT(*) > 1
)
SELECT ids[1] AS keeper_id, UNNEST(ids[2:]) AS loser_id
FROM grouped;

-- scores → keeper (no unique constraint worth worrying about).
UPDATE scores s
SET song_id = m.keeper_id
FROM song_merge_map m
WHERE s.song_id = m.loser_id;

-- setlist_items → keeper.
UPDATE setlist_items si
SET song_id = m.keeper_id
FROM song_merge_map m
WHERE si.song_id = m.loser_id;

-- repertoire has UNIQUE (user_id, song_id). Multiple rows per user could
-- collapse onto the same (user, keeper) pair — e.g. a user who registered
-- BOTH "Song (プロオケ)" and "Song (生音)" separately, or BOTH a loser and
-- the keeper. Deduplicate first: keep exactly one row per
-- (user_id, canonical_song_id), preferring the oldest `added_at` (tie-broken
-- by id for stability). Rows with rn > 1 are dropped.
WITH rep_with_canon AS (
  SELECT
    r.id AS rep_id,
    ROW_NUMBER() OVER (
      PARTITION BY r.user_id, COALESCE(m.keeper_id, r.song_id)
      ORDER BY r.added_at ASC, r.id ASC
    ) AS rn
  FROM repertoire r
  LEFT JOIN song_merge_map m ON m.loser_id = r.song_id
)
DELETE FROM repertoire
WHERE id IN (SELECT rep_id FROM rep_with_canon WHERE rn > 1);

-- After dedup, each remaining loser row is the only (user, canonical) copy,
-- so UPDATE can safely point it at the keeper without conflict.
UPDATE repertoire r
SET song_id = m.keeper_id
FROM song_merge_map m
WHERE r.song_id = m.loser_id;

-- Drop the loser song rows.
DELETE FROM songs
WHERE id IN (SELECT loser_id FROM song_merge_map);

-- Normalize surviving titles so the UI shows the canonical name.
UPDATE songs
SET title = TRIM(regexp_replace(title,
  '\s*[\(（]\s*(プロオケ|生音|ガイドメロディ|ガイド|オリジナル|Original Karaoke|Original|Karaoke|Live|ライブ|アコースティック|Acoustic|Remix|Instrumental|Inst|カバー|Cover)\s*[\)）]',
  '', 'gi'))
WHERE title ~* '[\(（]\s*(プロオケ|生音|ガイドメロディ|ガイド|オリジナル|Original|Karaoke|Live|ライブ|アコースティック|Acoustic|Remix|Instrumental|Inst|カバー|Cover)\s*[\)）]';

COMMIT;

-- Verification: should return 0 rows. Re-run the migration is a no-op.
WITH canon AS (
  SELECT id,
    LOWER(TRIM(regexp_replace(title,
      '\s*[\(（]\s*(プロオケ|生音|ガイドメロディ|ガイド|オリジナル|Original Karaoke|Original|Karaoke|Live|ライブ|アコースティック|Acoustic|Remix|Instrumental|Inst|カバー|Cover)\s*[\)）]',
      '', 'gi'))) AS key,
    LOWER(TRIM(artist)) AS artist_key
  FROM songs
)
SELECT key, artist_key, COUNT(*) AS remaining_duplicates
FROM canon
GROUP BY key, artist_key
HAVING COUNT(*) > 1;
