-- ============================================================================
-- Migration 002: Extend confidence_level enum with 'wanna_sing' and 'shelf'
-- ============================================================================
--
-- Motivation:
--   Repertoire grouping beyond "practicing / normal / confident" — add
--   'wanna_sing' (pre-attempt) and 'shelf' (set aside). See
--   docs/implementation-roadmap.md Progress Log for design decision.
--
-- Apply on the live DB with:
--   Supabase SQL Editor → paste → Run
--
-- Idempotent: re-running is safe thanks to IF NOT EXISTS check.
-- ============================================================================

-- Each ADD VALUE is one SQL statement. Postgres does not allow ALTER TYPE ...
-- ADD VALUE inside a transaction block on some managed services (it blocks
-- running sessions from seeing the new value until commit). If Supabase SQL
-- Editor wraps the whole paste in a tx, split into separate runs.

-- 'wanna_sing' — placed before 'practicing' for natural ★ progression.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'wanna_sing'
      AND enumtypid = 'confidence_level'::regtype
  ) THEN
    ALTER TYPE confidence_level ADD VALUE 'wanna_sing' BEFORE 'practicing';
  END IF;
END $$;

-- 'shelf' — placed at the end (terminal state).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'shelf'
      AND enumtypid = 'confidence_level'::regtype
  ) THEN
    ALTER TYPE confidence_level ADD VALUE 'shelf' AFTER 'confident';
  END IF;
END $$;

-- Sanity check: list all current values so the operator can verify ordering.
SELECT enumlabel, enumsortorder
FROM pg_enum
WHERE enumtypid = 'confidence_level'::regtype
ORDER BY enumsortorder;
