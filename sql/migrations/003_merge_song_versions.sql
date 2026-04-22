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
--   This is destructive. Run the DRY-RUN block first, verify the affected
--   rows are truly the same song in different mixes, THEN run the MERGE
--   block. Keep a Supabase full-DB snapshot before running the merge.
--
-- Idempotent on re-run: once duplicates are merged, subsequent runs return
-- 0 affected rows.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- [1/4] DRY-RUN: inspect what would be merged.
--       Run this alone first. If the output looks right, proceed to [2/4].
-- ----------------------------------------------------------------------------

WITH canon AS (
  SELECT
    id,
    title,
    artist,
    created_at,
    -- Replicate lib/song-title.ts canonicalization.
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
-- [2/4] MERGE: transfer child rows from losers → keepers, then delete losers.
--       Uncomment the BEGIN / COMMIT when ready to apply.
-- ----------------------------------------------------------------------------

-- BEGIN;

-- WITH canon AS (
--   SELECT
--     id, title, artist, created_at,
--     regexp_replace(
--       title,
--       '\s*[\(（]\s*(プロオケ|生音|ガイドメロディ|ガイド|オリジナル|Original Karaoke|Original|Karaoke|Live|ライブ|アコースティック|Acoustic|Remix|Instrumental|Inst|カバー|Cover)\s*[\)）]',
--       '', 'gi'
--     ) AS canonical_title
--   FROM songs
-- ),
-- grouped AS (
--   SELECT
--     LOWER(TRIM(canonical_title)) AS key,
--     LOWER(TRIM(artist))           AS artist_key,
--     ARRAY_AGG(id ORDER BY length(title) ASC, created_at ASC) AS ids
--   FROM canon
--   GROUP BY LOWER(TRIM(canonical_title)), LOWER(TRIM(artist))
--   HAVING COUNT(*) > 1
-- ),
-- mapping AS (
--   SELECT
--     ids[1] AS keeper_id,
--     UNNEST(ids[2:]) AS loser_id
--   FROM grouped
-- )
-- -- Move dependent rows to the keeper.
-- , move_scores AS (
--   UPDATE scores s
--   SET song_id = m.keeper_id
--   FROM mapping m
--   WHERE s.song_id = m.loser_id
--   RETURNING 1
-- ),
-- move_repertoire AS (
--   UPDATE repertoire r
--   SET song_id = m.keeper_id
--   FROM mapping m
--   WHERE r.song_id = m.loser_id
--   ON CONFLICT DO NOTHING  -- if user already had both versions in repertoire
--   RETURNING 1
-- ),
-- move_setlist_items AS (
--   UPDATE setlist_items si
--   SET song_id = m.keeper_id
--   FROM mapping m
--   WHERE si.song_id = m.loser_id
--   RETURNING 1
-- )
-- DELETE FROM songs WHERE id IN (SELECT loser_id FROM mapping);

-- COMMIT;


-- ----------------------------------------------------------------------------
-- [3/4] NORMALIZE PERSISTED TITLES: strip markers from the `title` column
--       on the surviving rows so the UI shows the canonical name.
-- ----------------------------------------------------------------------------

-- UPDATE songs
-- SET title = TRIM(
--   regexp_replace(
--     title,
--     '\s*[\(（]\s*(プロオケ|生音|ガイドメロディ|ガイド|オリジナル|Original Karaoke|Original|Karaoke|Live|ライブ|アコースティック|Acoustic|Remix|Instrumental|Inst|カバー|Cover)\s*[\)）]',
--     '', 'gi'
--   )
-- )
-- WHERE title ~* '[\(（]\s*(プロオケ|生音|ガイドメロディ|ガイド|オリジナル|Original|Karaoke|Live|ライブ|アコースティック|Acoustic|Remix|Instrumental|Inst|カバー|Cover)\s*[\)）]';


-- ----------------------------------------------------------------------------
-- [4/4] Sanity check: confirm no duplicate canonical keys remain.
--       Should return 0 rows.
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
