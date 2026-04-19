"""Supabase persistence layer.

Wraps supabase-py to expose the operations our sync pipeline needs:
- Upsert songs (by normalized title + artist)
- Insert sessions and attach scores to them
- Insert scores (idempotent via dam_scoring_id unique constraint)
- Insert score_pitch_intervals for detailFlg=1 records
- Track sync_logs
- INIT mode: wipe the target user's scores for a clean re-import

NOTE: In the PoC we use the SERVICE_ROLE key which bypasses RLS. In production,
the Edge Function / server-side runtime will use a user JWT and RLS will enforce
access control.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

import structlog
from supabase import Client, create_client

from src.parser import ParsedScore
from src.session_boundary import SessionGroup

logger = structlog.get_logger(__name__)


# ---------------------------------------------------------------
# Connection
# ---------------------------------------------------------------


def make_client(url: str, service_role_key: str) -> Client:
    """Create a Supabase client using the service_role key (bypasses RLS)."""
    return create_client(url, service_role_key)


# ---------------------------------------------------------------
# songs
# ---------------------------------------------------------------


def upsert_song(sb: Client, parsed: ParsedScore) -> str:
    """Upsert a song by normalized (title, artist). Returns the song.id (UUID).

    Uses the unique index songs_title_artist_uniq. We do a select-first pattern
    because supabase-py's upsert() requires on_conflict="title_normalized,artist_normalized"
    which doesn't work well when those are GENERATED columns.

    Race condition note: two concurrent inserts of the same song will both try
    to INSERT and one will fail with 23505. In PoC this is fine (single-process).
    """
    # 1. Try to find existing
    title_norm = parsed.song_title.lower().strip()
    artist_norm = parsed.song_artist.lower().strip()
    existing = (
        sb.table("songs")
        .select("id")
        .eq("title_normalized", title_norm)
        .eq("artist_normalized", artist_norm)
        .limit(1)
        .execute()
    )
    if existing.data:
        return existing.data[0]["id"]

    # 2. Insert new
    payload: dict[str, Any] = {
        "title": parsed.song_title,
        "artist": parsed.song_artist,
        "request_no": parsed.request_no,
        "dam_contents_id": parsed.dam_contents_id,
    }
    # Don't set vocal_range here; the DB trigger does it from scores.
    result = sb.table("songs").insert(payload).execute()
    song_id = result.data[0]["id"]
    logger.info("song_created", song_id=song_id, title=parsed.song_title, artist=parsed.song_artist)
    return song_id


# ---------------------------------------------------------------
# sessions
# ---------------------------------------------------------------


def create_session(sb: Client, user_id: str, group: SessionGroup) -> str:
    """Create a new session row. Returns the session.id.

    Aggregates (score_count/avg_score/max_score) will be refreshed by the
    scores_touch_session() trigger after scores are inserted.
    """
    payload = {
        "user_id": user_id,
        "started_at": group.started_at.isoformat(),
        "ended_at": group.ended_at.isoformat(),
    }
    result = sb.table("sessions").insert(payload).execute()
    session_id = result.data[0]["id"]
    logger.info(
        "session_created",
        session_id=session_id,
        started_at=group.started_at.isoformat(),
        score_count=group.score_count,
    )
    return session_id


def find_session_covering(sb: Client, user_id: str, at: datetime, gap_hours: float) -> str | None:
    """Find an existing session whose window could absorb a score at `at`.

    Used for incremental sync: if the new score's sung_at is within gap_hours
    of an existing session's ended_at, we extend that session rather than
    create a new one.
    """
    from datetime import timedelta

    window_start = (at - timedelta(hours=gap_hours)).isoformat()
    window_end = (at + timedelta(hours=gap_hours)).isoformat()

    result = (
        sb.table("sessions")
        .select("id, started_at, ended_at")
        .eq("user_id", user_id)
        .gte("ended_at", window_start)
        .lte("started_at", window_end)
        .order("started_at", desc=True)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]["id"]
    return None


def extend_session(sb: Client, session_id: str, new_end: datetime) -> None:
    """Push out session.ended_at if the new score is later than current end."""
    sb.table("sessions").update({"ended_at": new_end.isoformat()}).eq("id", session_id).execute()


# ---------------------------------------------------------------
# scores
# ---------------------------------------------------------------


@dataclass
class ScoreInsertResult:
    inserted: bool
    score_id: str | None


def insert_score(
    sb: Client,
    user_id: str,
    song_id: str,
    session_id: str,
    parsed: ParsedScore,
) -> ScoreInsertResult:
    """Insert a score row. Returns (inserted=False) if already exists.

    Relies on scores_dam_id_uniq (user_id, scoring_type, dam_scoring_id) to
    dedupe via ON CONFLICT DO NOTHING.
    """
    payload: dict[str, Any] = {
        "user_id": user_id,
        "song_id": song_id,
        "session_id": session_id,
        "scoring_type": parsed.scoring_type,
        "dam_scoring_id": parsed.dam_scoring_id,
        "sung_at": parsed.sung_at.isoformat(),
        "total_score": parsed.total_score,
        "pitch_score": parsed.pitch_score,
        "stability_score": parsed.stability_score,
        "expression_score": parsed.expression_score,
        "vibrato_longtone_score": parsed.vibrato_longtone_score,
        "rhythm_score": parsed.rhythm_score,
        "ai_bonus": parsed.ai_bonus,
        "key_control": parsed.key_control,
        "tempo_control": parsed.tempo_control,
        "guide_melody": parsed.guide_melody,
        "singing_range_lowest": parsed.singing_range_lowest,
        "singing_range_highest": parsed.singing_range_highest,
        "vocal_range_lowest": parsed.vocal_range_lowest,
        "vocal_range_highest": parsed.vocal_range_highest,
        "raw_xml": parsed.raw_xml,
    }

    try:
        result = sb.table("scores").insert(payload).execute()
        return ScoreInsertResult(inserted=True, score_id=result.data[0]["id"])
    except Exception as exc:  # supabase-py wraps PostgREST errors
        # Detect unique violation (code 23505)
        msg = str(exc).lower()
        if "duplicate key" in msg or "23505" in msg or "unique" in msg:
            logger.debug("score_already_exists", dam_scoring_id=parsed.dam_scoring_id)
            return ScoreInsertResult(inserted=False, score_id=None)
        raise


def insert_pitch_intervals(
    sb: Client,
    user_id: str,
    score_id: str,
    intervals: list[int],
) -> None:
    """Insert the 24-section pitch data for a score."""
    payload = {
        "score_id": score_id,
        "user_id": user_id,
        "intervals": intervals,
    }
    try:
        sb.table("score_pitch_intervals").insert(payload).execute()
    except Exception as exc:
        msg = str(exc).lower()
        if "duplicate key" in msg or "23505" in msg:
            return  # Already exists
        raise


# ---------------------------------------------------------------
# sync_logs
# ---------------------------------------------------------------


def start_sync_log(sb: Client, user_id: str) -> str:
    result = sb.table("sync_logs").insert({
        "user_id": user_id,
        "status": "running",
    }).execute()
    return result.data[0]["id"]


def finish_sync_log(
    sb: Client,
    sync_log_id: str,
    status: str,
    scores_fetched: int,
    scores_new: int,
    error_message: str | None = None,
) -> None:
    payload = {
        "status": status,
        "finished_at": datetime.utcnow().isoformat() + "Z",
        "scores_fetched": scores_fetched,
        "scores_new": scores_new,
        "error_message": error_message,
    }
    sb.table("sync_logs").update(payload).eq("id", sync_log_id).execute()


# ---------------------------------------------------------------
# INIT mode helpers
# ---------------------------------------------------------------


def wipe_user_scores(sb: Client, user_id: str) -> dict[str, int]:
    """Delete ALL scores / sessions for a user (for INIT re-import).

    songs are left alone because they're a shared catalog.
    Returns a dict of deleted counts.

    WARNING: irreversible. Wrapped in CLI confirmation prompt.
    """
    # score_pitch_intervals and scores cascade automatically via FK ON DELETE CASCADE
    # when the parent user row is deleted. But we're not deleting the user,
    # so we delete explicitly in FK-safe order.

    pitch_del = sb.table("score_pitch_intervals").delete().eq("user_id", user_id).execute()
    scores_del = sb.table("scores").delete().eq("user_id", user_id).execute()
    sessions_del = sb.table("sessions").delete().eq("user_id", user_id).execute()
    sync_logs_del = sb.table("sync_logs").delete().eq("user_id", user_id).execute()

    result = {
        "pitch_intervals": len(pitch_del.data or []),
        "scores": len(scores_del.data or []),
        "sessions": len(sessions_del.data or []),
        "sync_logs": len(sync_logs_del.data or []),
    }
    logger.warning("user_data_wiped", user_id=user_id, **result)
    return result
