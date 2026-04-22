-- ============================================================================
-- Migration 005: advice_feedback — user 👍/👎 reactions to Finding cards
-- ============================================================================
--
-- Used by S6 to collect material for tuning the advice thresholds. Each row
-- is one user × rule × sign vote; re-voting updates the same row via PK.
-- No per-score linkage yet — we track rule-level preference only.
--
-- Idempotent: IF NOT EXISTS on CREATE, ON CONFLICT DO UPDATE for RLS policy
-- re-install.
-- ============================================================================

CREATE TABLE IF NOT EXISTS advice_feedback (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id    TEXT NOT NULL,            -- e.g. "R01.bonus_diminishing"
  vote       SMALLINT NOT NULL,        -- +1 = useful, -1 = not useful
  note       TEXT,                     -- reserved for free-form feedback (nullable)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT advice_feedback_pkey PRIMARY KEY (user_id, rule_id),
  CONSTRAINT advice_feedback_vote_range CHECK (vote IN (-1, 1))
);

-- RLS so a user can only see / mutate their own feedback.
ALTER TABLE advice_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS advice_feedback_owner_select ON advice_feedback;
CREATE POLICY advice_feedback_owner_select ON advice_feedback
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS advice_feedback_owner_insert ON advice_feedback;
CREATE POLICY advice_feedback_owner_insert ON advice_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS advice_feedback_owner_update ON advice_feedback;
CREATE POLICY advice_feedback_owner_update ON advice_feedback
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS advice_feedback_owner_delete ON advice_feedback;
CREATE POLICY advice_feedback_owner_delete ON advice_feedback
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE advice_feedback IS
  'S6: Per-user 👍/👎 votes on advice rules for threshold calibration. PK (user_id, rule_id) — revotes are upserts.';
