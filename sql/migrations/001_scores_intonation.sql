-- ============================================================================
-- Migration 001: Add scores.intonation
-- ============================================================================
--
-- Motivation:
--   The advice engine (see docs/feature-design/advice-engine.md) needs
--   `intonation` (抑揚) as a first-class column for R02 (抑揚 → 表現力上限
--   診断) and likely for aggregate queries later. Every other augmented
--   field stays in raw_xml (JSONB) for now — see §5.3 of the design doc.
--
-- Apply on the live DB with:
--   Supabase SQL Editor → paste this file → Run
--
-- Idempotent: re-running is safe.
-- ============================================================================

-- 1. Add the column. SMALLINT (0-100 range, but DAM occasionally emits higher
--    values for long/unusual recordings — leave it unconstrained for now).
ALTER TABLE scores
  ADD COLUMN IF NOT EXISTS intonation SMALLINT;

COMMENT ON COLUMN scores.intonation IS
  'DAM intonation metric (抑揚, 0-100). Extracted from raw_xml at sync time. Used by advice-engine R02 (抑揚 → 表現力上限).';

-- 2. Backfill from existing raw_xml rows. Two shapes are present:
--    (a) Python PoC (xmltodict):  raw_xml -> 'scoring' -> '@intonation'
--    (b) Edge Function (fast-xml-parser): raw_xml -> '@_intonation'
--    Try (a) first; fall back to (b). Cast to SMALLINT. Non-numeric / missing
--    stays NULL.
UPDATE scores
SET intonation = (
  COALESCE(
    raw_xml #>> '{scoring,@intonation}',
    raw_xml #>> '{@_intonation}'
  )::smallint
)
WHERE intonation IS NULL
  AND (
    raw_xml #>> '{scoring,@intonation}' ~ '^\d+$'
    OR raw_xml #>> '{@_intonation}' ~ '^\d+$'
  );

-- 3. Report row counts so the operator can sanity-check the backfill.
DO $$
DECLARE
  total_rows BIGINT;
  filled_rows BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_rows FROM scores;
  SELECT COUNT(*) INTO filled_rows FROM scores WHERE intonation IS NOT NULL;
  RAISE NOTICE 'Migration 001 complete: % / % rows have intonation populated', filled_rows, total_rows;
END $$;
