-- ============================================================================
-- Migration 003: Merge song version duplicates (プロオケ / 生音 など)
-- ============================================================================
--
-- Motivation:
--   DAM returns `contentsName` embedded with version markers like
--   "ビンテージ (プロオケ)(生音)". Without normalization these create
--   separate `songs` rows, fragmenting the user's history.
--
--   The parser (Edge Function + app-side action) now strips these markers
--   before upsert — so new inserts will naturally converge. This migration
--   fixes the *existing* rows.
--
-- APPLY POLICY:
--   Destructive. Run the DRY-RUN block first, verify the affected rows are
--   truly the same song in different mixes, THEN run the MERGE block.
--   Keep a Supabase full-DB snapshot before running the merge.
--
-- Idempotent on re-run: once duplicates are merged, subsequent runs find
-- 0 groups and exit cleanly.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- [1/3] DRY-RUN: inspect what would be merged. Run this alone first.
-- ----------------------------------------------------------------------------

WITH canon AS (
  SELECT
    id,
    title,
    artist,
    created_at,
    regexp_replace(
      title,
      '\s*[\(（]\s*(プロオケ|生音|ガイドメロディ|ガイド|オリジナル|Original Karaoke|Original|Karaoke|Live|ライブ|アコースティック|Acoustic|Remix|Instrumental|Inst|カバー|Cover)\s*[\)）]',
      '',
      'gi'
    ) AS canonical_title
  FROM songs
),
grouped AS (
  SELECT
    LOWER(TRIM(canonical_title)) AS key,
    LOWER(TRIM(artist))           AS artist_key,
    ARRAY_AGG(id ORDER BY length(title) ASC, created_at ASC) AS ids,
    ARRAY_AGG(title ORDER BY length(title) ASC, created_at ASC) AS titles,
    COUNT(*) AS cnt
  FROM canon
  GROUP BY LOWER(TRIM(canonical_title)), LOWER(TRIM(artist))
)
SELECT
  key AS canonical_title,
  artist_key,
  cnt AS duplicates,
  ids[1] AS keeper_id,
  titles[1] AS keeper_title,
  ids[2:] AS losers_ids,
  titles[2:] AS losers_titles
FROM grouped
WHERE cnt > 1
ORDER BY cnt DESC, canonical_title;


-- ----------------------------------------------------------------------------
-- [2/3] MERGE: run as a single transaction. Uncomment BEGIN/COMMIT when ready.
--       Each step is written as a separate statement so failures roll back
--       cleanly and you can inspect intermediate state if needed.
--       Uses a TEMP TABLE instead of data-modifying CTEs — the latter has
--       ordering caveats in Postgres (each CTE sees the pre-statement state).
-- ----------------------------------------------------------------------------

-- BEGIN;

-- -- Build the keeper→loser mapping once.
-- CREATE TEMP TABLE song_merge_map ON COMMIT DROP AS
-- WITH canon AS (
--   SELECT
--     id, title, artist, created_at,
--     regexp_replace(title,
--       '\s*[\(（]\s*(プロオケ|生音|ガイドメロディ|ガイド|オリジナル|Original Karaoke|Original|Karaoke|Live|ライブ|アコースティック|Acoustic|Remix|Instrumental|Inst|カバー|Cover)\s*[\)）]',
--       '', 'gi') AS canonical_title
--   FROM songs
-- ),
-- grouped AS (
--   SELECT
--     ARRAY_AGG(id ORDER BY length(title) ASC, created_at ASC) AS ids
--   FROM canon
--   GROUP BY LOWER(TRIM(canonical_title)), LOWER(TRIM(artist))
--   HAVING COUNT(*) > 1
-- )
-- SELECT ids[1] AS keeper_id, UNNEST(ids[2:]) AS loser_id
-- FROM grouped;

-- -- Step A: scores → keeper. Safe; scores has no uniqueness that would conflict.
-- UPDATE scores s
-- SET song_id = m.keeper_id
-- FROM song_merge_map m
-- WHERE s.song_id = m.loser_id;

-- -- Step B: setlist_items → keeper. Likewise no conflicting unique constraint.
-- UPDATE setlist_items si
-- SET song_id = m.keeper_id
-- FROM song_merge_map m
-- WHERE si.song_id = m.loser_id;

-- -- Step C: repertoire. UNIQUE (user_id, song_id) means we must first DELETE
-- -- loser rows where the same user already has the keeper, then UPDATE the rest.
-- DELETE FROM repertoire r
-- WHERE EXISTS (
--   SELECT 1
--   FROM song_merge_map m
--   WHERE r.song_id = m.loser_id
--     AND EXISTS (
--       SELECT 1 FROM repertoire r2
--       WHERE r2.user_id = r.user_id
--         AND r2.song_id = m.keeper_id
--     )
-- );

-- UPDATE repertoire r
-- SET song_id = m.keeper_id
-- FROM song_merge_map m
-- WHERE r.song_id = m.loser_id;

-- -- Step D: finally delete the loser song rows.
-- DELETE FROM songs
-- WHERE id IN (SELECT loser_id FROM song_merge_map);

-- -- Step E: normalize the surviving titles so the UI shows the canonical name.
-- UPDATE songs
-- SET title = TRIM(regexp_replace(title,
--   '\s*[\(（]\s*(プロオケ|生音|ガイドメロディ|ガイド|オリジナル|Original Karaoke|Original|Karaoke|Live|ライブ|アコースティック|Acoustic|Remix|Instrumental|Inst|カバー|Cover)\s*[\)）]',
--   '', 'gi'))
-- WHERE title ~* '[\(（]\s*(プロオケ|生音|ガイドメロディ|ガイド|オリジナル|Original|Karaoke|Live|ライブ|アコースティック|Acoustic|Remix|Instrumental|Inst|カバー|Cover)\s*[\)）]';

-- COMMIT;


-- ----------------------------------------------------------------------------
-- [3/3] VERIFY: should return 0 rows when all duplicates are merged.
-- ----------------------------------------------------------------------------

-- WITH canon AS (
--   SELECT id, LOWER(TRIM(regexp_replace(title,
--     '\s*[\(（]\s*(プロオケ|生音|ガイドメロディ|ガイド|オリジナル|Original Karaoke|Original|Karaoke|Live|ライブ|アコースティック|Acoustic|Remix|Instrumental|Inst|カバー|Cover)\s*[\)）]',
--     '', 'gi'))) AS key,
--     LOWER(TRIM(artist)) AS artist_key
--   FROM songs
-- )
-- SELECT key, artist_key, COUNT(*) AS cnt
-- FROM canon
-- GROUP BY key, artist_key
-- HAVING COUNT(*) > 1;
