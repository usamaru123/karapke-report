-- ============================================================================
-- Karaoke Repertoire Management App - Database Schema
-- Target: Supabase (PostgreSQL 15+)
-- Design: Multi-tenant ready, RLS enforced, raw_xml preserved for resilience
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- For fuzzy search on title/artist
-- supabase_vault extension is retained (enabled in the project) but currently
-- UNUSED. The initial design stored cdmCardNo as an encrypted vault secret,
-- but MVP fell back to a plaintext column (see profiles below). Re-introduce
-- vault usage in a future iteration if cdmCardNo sensitivity warrants it.
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA vault;


-- ============================================================================
-- ENUMs
-- ============================================================================

-- Confidence level / workflow stage for a repertoire song.
-- Ordered conceptually from "I want to try this" through "I've mastered it",
-- plus a "shelved" terminal state for songs the user has put aside.
-- See sql/migrations/002_confidence_level_expand.sql for the ADD VALUE steps
-- applied to an existing DB.
CREATE TYPE confidence_level AS ENUM (
  'wanna_sing',  -- 歌いたい (★☆☆☆☆) — まだ未挑戦 / 挑戦予定
  'practicing',  -- 練習中   (★★☆☆☆)
  'normal',      -- 普通     (★★★☆☆)
  'confident',   -- 得意     (★★★★☆)
  'shelf'        -- 封印     (★★★★★ — 使わない / 保留)
);

-- Source of vocal range data (for future multi-source support)
CREATE TYPE range_source AS ENUM (
  'dam_ai',          -- DAM scoring Ai API response
  'audio_analysis',  -- Future: self-analysis via Demucs+RMVPE
  'manual'           -- User-entered
);

-- Scoring machine type (from DAM API `scoringType` field)
CREATE TYPE scoring_type AS ENUM (
  'ai',              -- 精密採点Ai
  'ai_heart',        -- 精密採点Ai Heart
  'dxg',             -- 精密採点DX-G
  'dx',              -- 精密採点DX
  'other'
);


-- ============================================================================
-- TABLE: profiles
-- User profile + DAM credentials
-- ============================================================================
-- DESIGN NOTE: cdmCardNo was originally designed to live in Supabase Vault
-- (encrypted at rest) and the column was named `cdm_card_no_vault_id UUID`.
-- MVP fell back to plaintext storage because Vault wiring added schema/runtime
-- complexity disproportionate to the single-user threat model. If this app
-- ever serves multiple users with distinct threat boundaries, rotate to Vault
-- and restore the helper functions to vault-backed implementations.
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  cdm_card_no   TEXT,                                    -- plaintext; RLS-scoped
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN profiles.cdm_card_no IS
  'DAM membership card number (base64-encoded, ~20 chars). Stored plaintext; access guarded by RLS so only the owning user (or service_role) can read.';


-- ============================================================================
-- TABLE: songs
-- Master of songs. One row per unique (title, artist) across all users.
-- Shared across users to avoid duplication, but access is still controlled
-- via RLS on repertoire/scores tables.
-- ============================================================================
CREATE TABLE songs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                 TEXT NOT NULL,
  title_normalized      TEXT GENERATED ALWAYS AS (LOWER(TRIM(title))) STORED,
  artist                TEXT NOT NULL,
  artist_normalized     TEXT GENERATED ALWAYS AS (LOWER(TRIM(artist))) STORED,

  -- DAM-specific identifiers (nullable; populated when available)
  request_no            TEXT,                 -- e.g. "1309-12"
  dam_contents_id       TEXT,                 -- Internal DAM ID if known

  -- Vocal range in MIDI note numbers (48=C3, 60=C4, 72=C5)
  vocal_range_lowest    SMALLINT,             -- MIDI note, nullable
  vocal_range_highest   SMALLINT,             -- MIDI note, nullable
  range_source          range_source,         -- NULL if range unknown
  range_updated_at      TIMESTAMPTZ,

  -- Song metadata (future extension; nullable)
  duration_sec          INTEGER,
  genre                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Range sanity: highest must be >= lowest when both present
  CONSTRAINT songs_range_check CHECK (
    vocal_range_lowest IS NULL
    OR vocal_range_highest IS NULL
    OR vocal_range_highest >= vocal_range_lowest
  ),
  CONSTRAINT songs_midi_range_lo CHECK (
    vocal_range_lowest IS NULL OR vocal_range_lowest BETWEEN 21 AND 108
  ),
  CONSTRAINT songs_midi_range_hi CHECK (
    vocal_range_highest IS NULL OR vocal_range_highest BETWEEN 21 AND 108
  )
);

-- Unique combination of normalized title + artist
CREATE UNIQUE INDEX songs_title_artist_uniq
  ON songs (title_normalized, artist_normalized);

-- Fuzzy text search (trigram index for ILIKE / similarity)
CREATE INDEX songs_title_trgm ON songs USING GIN (title gin_trgm_ops);
CREATE INDEX songs_artist_trgm ON songs USING GIN (artist gin_trgm_ops);

COMMENT ON COLUMN songs.vocal_range_lowest IS
  'MIDI note number (21-108). Source: latest scoringAi response (policy: overwrite on new data).';


-- ============================================================================
-- TABLE: sessions
-- A karaoke session = a contiguous block of songs at one visit
-- Auto-created when importing scores, boundaries inferred by time gap (>3h)
-- ============================================================================
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session boundaries
  started_at    TIMESTAMPTZ NOT NULL,
  ended_at      TIMESTAMPTZ NOT NULL,

  -- Cached aggregates (updated by trigger when scores change)
  score_count       INTEGER NOT NULL DEFAULT 0,
  avg_score         NUMERIC(6,3),
  max_score         NUMERIC(6,3),

  -- Free-form user notes (future use)
  venue_name    TEXT,          -- e.g. "ビッグエコー新宿店"
  memo          TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT sessions_time_order CHECK (ended_at >= started_at)
);

CREATE INDEX sessions_user_started ON sessions (user_id, started_at DESC);


-- ============================================================================
-- TABLE: scores
-- Scoring records. One row per sung song per attempt. Never deleted.
-- Permanent storage beyond DAM's 200-record limit.
-- ============================================================================
CREATE TABLE scores (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id               UUID NOT NULL REFERENCES songs(id) ON DELETE RESTRICT,
  session_id            UUID REFERENCES sessions(id) ON DELETE SET NULL,

  -- DAM external ID for deduplication on re-import
  scoring_type          scoring_type NOT NULL,
  dam_scoring_id        TEXT NOT NULL,        -- scoringAiId from XML

  sung_at               TIMESTAMPTZ NOT NULL,

  -- Main score
  total_score           NUMERIC(6,3) NOT NULL,  -- e.g. 90.298

  -- Radar (5 axes of Ai Scoring)
  pitch_score           NUMERIC(5,2),           -- 音程
  stability_score       NUMERIC(5,2),           -- 安定性
  expression_score      NUMERIC(5,2),           -- 表現力
  vibrato_longtone_score NUMERIC(5,2),          -- ビブラート&ロングトーン
  rhythm_score          NUMERIC(5,2),           -- リズム

  -- Ai bonus points (精密採点Ai-specific)
  ai_bonus              NUMERIC(5,2),

  -- Intonation (抑揚, 0-100). Extracted from raw_xml at sync time.
  -- Used by the advice engine (docs/feature-design/advice-engine.md R02).
  -- See sql/migrations/001_scores_intonation.sql for the add-to-existing-DB migration.
  intonation            SMALLINT,

  -- Performance context
  key_control           SMALLINT NOT NULL DEFAULT 0,  -- -6..+6
  tempo_control         SMALLINT,                     -- Nullable, rare
  guide_melody          BOOLEAN,

  -- Range measurements for THIS performance
  singing_range_lowest  SMALLINT,   -- MIDI: what user actually sang
  singing_range_highest SMALLINT,
  vocal_range_lowest    SMALLINT,   -- MIDI: the song's guide range at this scoring
  vocal_range_highest   SMALLINT,

  -- Safety net: raw XML for schema evolution
  raw_xml               JSONB NOT NULL,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate import of the same scoring record
  CONSTRAINT scores_dam_id_uniq UNIQUE (user_id, scoring_type, dam_scoring_id),

  CONSTRAINT scores_key_range CHECK (key_control BETWEEN -6 AND 6),
  CONSTRAINT scores_total_range CHECK (total_score BETWEEN 0 AND 100)
);

CREATE INDEX scores_user_sung_at   ON scores (user_id, sung_at DESC);
CREATE INDEX scores_song           ON scores (song_id, sung_at DESC);
CREATE INDEX scores_session        ON scores (session_id);
CREATE INDEX scores_user_total     ON scores (user_id, total_score DESC);

COMMENT ON COLUMN scores.raw_xml IS
  'Full DAM scoring XML as JSON. Preserved permanently to survive schema changes and allow reprocessing.';
COMMENT ON COLUMN scores.dam_scoring_id IS
  'scoringAiId from DAM XML. Used for deduplication when re-importing the same record.';


-- ============================================================================
-- TABLE: score_pitch_intervals
-- 24-section pitch bar data (only populated for scores where detailFlg=1).
-- Kept separate to avoid bloating the main scores table.
-- ============================================================================
CREATE TABLE score_pitch_intervals (
  score_id      UUID PRIMARY KEY REFERENCES scores(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Array of 24 pitch scores (0-100 scale per DAM spec)
  intervals     SMALLINT[] NOT NULL,
  -- Free JSON for additional timeline data (melody bar, Ai sensibility graph)
  details       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pitch_24_elements CHECK (array_length(intervals, 1) = 24)
);

CREATE INDEX pitch_intervals_user ON score_pitch_intervals (user_id);


-- ============================================================================
-- TABLE: advice_feedback
-- 👍 / 👎 votes on advice rules. S6 material for threshold calibration.
-- See sql/migrations/005_advice_feedback.sql for the add-to-existing-DB
-- migration (IF NOT EXISTS).
-- ============================================================================
CREATE TABLE advice_feedback (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id    TEXT NOT NULL,            -- e.g. "R01.bonus_diminishing"
  vote       SMALLINT NOT NULL,        -- +1 = useful, -1 = not useful
  note       TEXT,                     -- reserved for free-form feedback
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT advice_feedback_pkey PRIMARY KEY (user_id, rule_id),
  CONSTRAINT advice_feedback_vote_range CHECK (vote IN (-1, 1))
);


-- ============================================================================
-- TABLE: repertoire
-- User's repertoire entries (a curated subset of songs with personal metadata)
-- ============================================================================
CREATE TABLE repertoire (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id            UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,

  -- User's personal preferences for this song
  preferred_key      SMALLINT NOT NULL DEFAULT 0,
  -- Default to 'unset' so rows auto-added by sync / bulk insert start
  -- untagged; the user promotes them to wanna_sing / practicing / etc.
  -- Migration 007 flipped this from 'normal' → 'unset' and reset existing rows.
  confidence         confidence_level NOT NULL DEFAULT 'unset',
  tags               TEXT[] NOT NULL DEFAULT '{}',
  memo               TEXT,

  -- Pinned / favorited flag for quick filtering
  is_favorite        BOOLEAN NOT NULL DEFAULT FALSE,

  added_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One song can appear only once per user's repertoire
  CONSTRAINT repertoire_user_song_uniq UNIQUE (user_id, song_id),
  CONSTRAINT repertoire_key_range CHECK (preferred_key BETWEEN -6 AND 6)
);

CREATE INDEX repertoire_user        ON repertoire (user_id);
CREATE INDEX repertoire_user_fav    ON repertoire (user_id) WHERE is_favorite;
CREATE INDEX repertoire_tags        ON repertoire USING GIN (tags);


-- ============================================================================
-- TABLE: setlists
-- User's saved setlists (playlists for a karaoke visit)
-- ============================================================================
CREATE TABLE setlists (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name               TEXT NOT NULL,
  description        TEXT,
  scheduled_for      DATE,          -- Planned visit date; nullable for templates
  is_pinned          BOOLEAN NOT NULL DEFAULT FALSE,

  -- Template flag: when TRUE the row is a reusable preset, hidden from the
  -- main setlists list and offered as "copy from" source for new setlists.
  -- Migration 009 introduced this column on the live DB.
  is_template        BOOLEAN NOT NULL DEFAULT FALSE,
  -- If this setlist was cloned from a template, pointer back at that
  -- template. SET NULL on delete so the copied rows survive template removal.
  template_source_id UUID REFERENCES setlists(id) ON DELETE SET NULL,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX setlists_user ON setlists (user_id, is_pinned DESC, created_at DESC);
CREATE INDEX setlists_templates ON setlists (user_id, is_template)
  WHERE is_template = TRUE;


-- ============================================================================
-- TABLE: setlist_items
-- Ordered items within a setlist. Explicit position column for DnD reorder.
-- ============================================================================
CREATE TABLE setlist_items (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setlist_id         UUID NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
  -- Denormalized for RLS efficiency
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id            UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,

  -- Ordering within the setlist (0, 1, 2, ...).
  -- Use integer steps of 1; reorder = recompute all positions in a transaction.
  position           INTEGER NOT NULL,

  -- Per-setlist overrides (optional)
  key_override       SMALLINT,  -- NULL = use repertoire preferred_key
  note               TEXT,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT setlist_items_pos_uniq UNIQUE (setlist_id, position),
  CONSTRAINT setlist_items_key_range CHECK (
    key_override IS NULL OR key_override BETWEEN -6 AND 6
  )
);

CREATE INDEX setlist_items_setlist ON setlist_items (setlist_id, position);
CREATE INDEX setlist_items_user    ON setlist_items (user_id);


-- ============================================================================
-- TABLE: sync_logs
-- Record of each DAM API sync attempt (for debugging and rate limit tracking)
-- ============================================================================
CREATE TABLE sync_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at         TIMESTAMPTZ,
  status              TEXT NOT NULL,        -- 'running' | 'success' | 'error'
  scores_fetched      INTEGER,
  scores_new          INTEGER,
  error_message       TEXT,

  -- Full response payload reference (path in Supabase Storage)
  raw_response_path   TEXT
);

CREATE INDEX sync_logs_user ON sync_logs (user_id, started_at DESC);


-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update `updated_at` on common tables
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER songs_updated_at
  BEFORE UPDATE ON songs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER repertoire_updated_at
  BEFORE UPDATE ON repertoire FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER setlists_updated_at
  BEFORE UPDATE ON setlists FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- Auto-maintain session aggregates when scores are inserted/updated/deleted
CREATE OR REPLACE FUNCTION refresh_session_stats(p_session_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE sessions s
  SET
    score_count = sub.cnt,
    avg_score   = sub.avg,
    max_score   = sub.max
  FROM (
    SELECT
      COUNT(*) AS cnt,
      AVG(total_score) AS avg,
      MAX(total_score) AS max
    FROM scores WHERE session_id = p_session_id
  ) sub
  WHERE s.id = p_session_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION scores_touch_session()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF OLD.session_id IS NOT NULL THEN
      PERFORM refresh_session_stats(OLD.session_id);
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.session_id IS NOT NULL THEN
    PERFORM refresh_session_stats(NEW.session_id);
  END IF;
  -- If session changed, also refresh the old one
  IF TG_OP = 'UPDATE' AND OLD.session_id IS DISTINCT FROM NEW.session_id
     AND OLD.session_id IS NOT NULL THEN
    PERFORM refresh_session_stats(OLD.session_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scores_session_stats
  AFTER INSERT OR UPDATE OR DELETE ON scores
  FOR EACH ROW EXECUTE FUNCTION scores_touch_session();


-- Policy: overwrite song.vocal_range when new scoring brings fresh range data
CREATE OR REPLACE FUNCTION songs_update_range_from_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vocal_range_lowest IS NULL OR NEW.vocal_range_highest IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE songs
  SET
    vocal_range_lowest  = NEW.vocal_range_lowest,
    vocal_range_highest = NEW.vocal_range_highest,
    range_source        = 'dam_ai',
    range_updated_at    = NOW()
  WHERE id = NEW.song_id
    AND (
      range_updated_at IS NULL
      OR range_updated_at < NEW.sung_at  -- Only overwrite with newer data
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scores_update_song_range
  AFTER INSERT ON scores
  FOR EACH ROW EXECUTE FUNCTION songs_update_range_from_score();


-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all user-scoped tables
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores                ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_pitch_intervals ENABLE ROW LEVEL SECURITY;
ALTER TABLE repertoire            ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlists              ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE advice_feedback       ENABLE ROW LEVEL SECURITY;

CREATE POLICY advice_feedback_owner_select ON advice_feedback
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY advice_feedback_owner_insert ON advice_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY advice_feedback_owner_update ON advice_feedback
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY advice_feedback_owner_delete ON advice_feedback
  FOR DELETE USING (auth.uid() = user_id);

-- songs is intentionally RLS-off: it's a shared catalog, no sensitive data.
-- If that changes, consider per-user song entries.

-- profiles: each user reads/writes only their own row
CREATE POLICY profiles_self_select ON profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_self_insert ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY profiles_self_update ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Generic user_id-based policy macro (applied to each table below)
CREATE POLICY sessions_owner ON sessions
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY scores_owner ON scores
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY pitch_intervals_owner ON score_pitch_intervals
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY repertoire_owner ON repertoire
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY setlists_owner ON setlists
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY setlist_items_owner ON setlist_items
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY sync_logs_owner ON sync_logs
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- ============================================================================
-- CREDENTIALS HELPER: store/retrieve cdmCardNo (plaintext, RLS-scoped)
-- ============================================================================
-- The function signatures (argument and return types) are preserved from the
-- earlier vault-backed design so existing callers (Edge Function, UI action)
-- keep working. Bodies are rewritten for plaintext access. Should this rotate
-- back to Vault in a future iteration, keep these signatures stable.

-- Upsert the caller's cdmCardNo. Returns void (callers should simply check
-- for absence of error). Relies on auth.uid() to resolve the target row.
CREATE OR REPLACE FUNCTION set_my_cdm_card_no(p_card_no TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, cdm_card_no)
  VALUES (auth.uid(), p_card_no)
  ON CONFLICT (id) DO UPDATE
    SET cdm_card_no = EXCLUDED.cdm_card_no,
        updated_at  = NOW();
END;
$$;

-- Server-side only. Callable by a service role (e.g. a scheduled sync job).
-- Not exposed to client / anon / authenticated roles.
CREATE OR REPLACE FUNCTION get_cdm_card_no_for(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card TEXT;
BEGIN
  SELECT cdm_card_no INTO v_card
    FROM profiles WHERE id = p_user_id;

  IF v_card IS NULL THEN
    RAISE EXCEPTION 'No cdmCardNo registered for user %', p_user_id;
  END IF;

  RETURN v_card;
END;
$$;

REVOKE ALL ON FUNCTION get_cdm_card_no_for(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_cdm_card_no_for(UUID) TO service_role;


-- ============================================================================
-- Notes
-- ============================================================================
-- Session boundary rule (applied in application layer on import):
--   If the new score's sung_at - (last_score.sung_at in same day) <= 3 hours,
--   attach to the existing session; otherwise create a new session.
--   Default gap threshold: 3 hours (configurable).
--
-- Ordering in setlist_items:
--   On reorder, recompute positions in one transaction. Do not attempt
--   fractional positions; integer 0..N keeps the UNIQUE index simple.
--
-- Raw XML retention:
--   scores.raw_xml is NEVER purged. Size is small (<10KB/row), so storage
--   cost is negligible. This is our escape hatch if DAM changes the schema.
