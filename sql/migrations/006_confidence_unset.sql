-- ============================================================================
-- Migration 006: Add `unset` confidence_level value (表示: 未設定)
-- ============================================================================
--
-- New repertoire rows auto-created by the sync pipeline start as 'unset' so
-- the user can see untagged songs in a dedicated filter bucket on the
-- repertoire list. Existing rows keep their current confidence.
--
-- Idempotent.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'unset'
      AND enumtypid = 'confidence_level'::regtype
  ) THEN
    ALTER TYPE confidence_level ADD VALUE 'unset' BEFORE 'wanna_sing';
  END IF;
END $$;

SELECT enumlabel, enumsortorder
FROM pg_enum
WHERE enumtypid = 'confidence_level'::regtype
ORDER BY enumsortorder;
