-- ============================================================================
-- Migration 008: Backfill repertoire from pre-existing scores
-- ============================================================================
--
-- The sync pipeline only started auto-inserting repertoire rows in commit
-- 76c5f92 ([UX-CONFIDENCE-UNSET-AUTO]). Songs sung before that never got
-- a repertoire row and now only exist in `scores`. With the UX redesign
-- that removed the "採点履歴から追加" UI, there's no way to pull them
-- back into repertoire manually.
--
-- This migration backfills: for every (user_id, song_id) observed in
-- scores without a matching repertoire row, insert a row with
-- confidence='unset' so the user can see and classify it from the list.
--
-- Idempotent via NOT EXISTS — existing repertoire rows are untouched
-- (preserves user's current tagging).
-- ============================================================================

BEGIN;

INSERT INTO repertoire (user_id, song_id, confidence)
SELECT DISTINCT s.user_id, s.song_id, 'unset'::confidence_level
FROM scores s
WHERE NOT EXISTS (
  SELECT 1 FROM repertoire r
  WHERE r.user_id = s.user_id AND r.song_id = s.song_id
);

COMMIT;

-- Report how many rows got backfilled + the total confidence distribution.
SELECT
  (SELECT COUNT(*) FROM repertoire) AS repertoire_rows_total,
  (SELECT COUNT(*) FROM repertoire WHERE confidence = 'unset') AS unset_rows;

SELECT confidence, COUNT(*) AS rows
FROM repertoire
GROUP BY confidence
ORDER BY rows DESC;
