-- ============================================================================
-- Migration 004: Add 良音 to the marker list and recognize [ / ］ brackets
-- ============================================================================
--
-- 003 left any song whose title used [良音] or [プロオケ] (square brackets
-- rather than parens) unstripped, because the regex only matched () / （）.
-- This runs the same merge logic with the expanded pattern so the remaining
-- duplicates collapse.
--
-- DESTRUCTIVE. Idempotent — after the first successful pass, re-running
-- finds 0 groups.
-- ============================================================================

BEGIN;

CREATE TEMP TABLE song_merge_map_004 ON COMMIT DROP AS
WITH canon AS (
  SELECT
    id, title, artist, created_at,
    regexp_replace(title,
      '\s*[\(（\[［]\s*(プロオケ|生音|良音|ガイドメロディ|ガイド|オリジナル|Original Karaoke|Original|Karaoke|Live|ライブ|アコースティック|Acoustic|Remix|Instrumental|Inst|カバー|Cover)\s*[\)）\]］]',
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

UPDATE scores s
SET song_id = m.keeper_id
FROM song_merge_map_004 m
WHERE s.song_id = m.loser_id;

UPDATE setlist_items si
SET song_id = m.keeper_id
FROM song_merge_map_004 m
WHERE si.song_id = m.loser_id;

-- Dedupe repertoire per (user, canonical_song) before remapping — see 003
-- for the rationale (same reasoning applies).
WITH rep_with_canon AS (
  SELECT
    r.id AS rep_id,
    ROW_NUMBER() OVER (
      PARTITION BY r.user_id, COALESCE(m.keeper_id, r.song_id)
      ORDER BY r.added_at ASC, r.id ASC
    ) AS rn
  FROM repertoire r
  LEFT JOIN song_merge_map_004 m ON m.loser_id = r.song_id
)
DELETE FROM repertoire
WHERE id IN (SELECT rep_id FROM rep_with_canon WHERE rn > 1);

UPDATE repertoire r
SET song_id = m.keeper_id
FROM song_merge_map_004 m
WHERE r.song_id = m.loser_id;

DELETE FROM songs
WHERE id IN (SELECT loser_id FROM song_merge_map_004);

-- Strip the expanded marker set from remaining titles.
UPDATE songs
SET title = TRIM(regexp_replace(title,
  '\s*[\(（\[［]\s*(プロオケ|生音|良音|ガイドメロディ|ガイド|オリジナル|Original Karaoke|Original|Karaoke|Live|ライブ|アコースティック|Acoustic|Remix|Instrumental|Inst|カバー|Cover)\s*[\)）\]］]',
  '', 'gi'))
WHERE title ~* '[\(（\[［]\s*(プロオケ|生音|良音|ガイドメロディ|ガイド|オリジナル|Original|Karaoke|Live|ライブ|アコースティック|Acoustic|Remix|Instrumental|Inst|カバー|Cover)\s*[\)）\]］]';

COMMIT;

-- Verification: should return 0 rows.
WITH canon AS (
  SELECT id,
    LOWER(TRIM(regexp_replace(title,
      '\s*[\(（\[［]\s*(プロオケ|生音|良音|ガイドメロディ|ガイド|オリジナル|Original Karaoke|Original|Karaoke|Live|ライブ|アコースティック|Acoustic|Remix|Instrumental|Inst|カバー|Cover)\s*[\)）\]］]',
      '', 'gi'))) AS key,
    LOWER(TRIM(artist)) AS artist_key
  FROM songs
)
SELECT key, artist_key, COUNT(*) AS remaining_duplicates
FROM canon
GROUP BY key, artist_key
HAVING COUNT(*) > 1;
