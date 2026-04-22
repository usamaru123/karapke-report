-- ============================================================================
-- Migration 009: setlists gains is_template / template_source_id
-- ============================================================================
--
-- Motivation: persistable "盛り上げ系" / "バラード系" presets. A template
-- is a normal setlist row with is_template=TRUE; cloning creates a new row
-- with is_template=FALSE and template_source_id pointing back at the
-- original. Templates are hidden from the main /setlists list and surfaced
-- in a dedicated section / creation dropdown.
--
-- Idempotent (IF NOT EXISTS on both columns + the partial index).
-- ============================================================================

ALTER TABLE setlists
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE setlists
  ADD COLUMN IF NOT EXISTS template_source_id UUID
    REFERENCES setlists(id) ON DELETE SET NULL;

-- Partial index speeds up the "templates only" query without costing
-- anything on non-template rows (they aren't in the index).
CREATE INDEX IF NOT EXISTS setlists_templates
  ON setlists (user_id, is_template)
  WHERE is_template = TRUE;

-- Sanity check: count templates vs. regular setlists.
SELECT
  COUNT(*) FILTER (WHERE is_template) AS templates,
  COUNT(*) FILTER (WHERE NOT is_template) AS regular
FROM setlists;
