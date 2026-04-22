-- ============================================================================
-- Migration 007: repertoire.confidence default → 'unset', existing default
-- rows reset
-- ============================================================================
--
-- The column default was 'normal', which meant every auto-inserted row
-- looked "普通" even though the user hadn't actually tagged it. Per request,
-- flip the default to 'unset' AND reclassify the existing 'normal' rows
-- back to 'unset' so the filter chip "未設定" actually surfaces them.
--
-- Anyone who had deliberately picked 'normal' will be reset too — that is
-- intentional (the user has no way to distinguish deliberate-normal from
-- default-normal, and they can re-promote from the list).
--
-- Idempotent.
-- ============================================================================

BEGIN;

ALTER TABLE repertoire
  ALTER COLUMN confidence SET DEFAULT 'unset';

UPDATE repertoire
SET confidence = 'unset'
WHERE confidence = 'normal';

COMMIT;

-- Post-migration distribution sanity check.
SELECT confidence, COUNT(*) AS rows
FROM repertoire
GROUP BY confidence
ORDER BY rows DESC;
