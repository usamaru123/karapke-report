"""Main sync orchestration.

Pipeline:
    1. Start sync_log
    2. Fetch all scoring records via DamClient
    3. Parse each <scoring> element into ParsedScore
    4. Sort by sung_at ascending
    5. Group into sessions (by time gap)
    6. For each session:
        - Find or create a session row
        - For each score in the session:
            - Upsert song
            - Insert score (skip if duplicate)
            - Insert pitch_intervals if present
    7. Finalize sync_log

The pipeline is idempotent: re-running it on the same data will not create
duplicates (thanks to the unique index on scores.dam_scoring_id).
"""

from __future__ import annotations

from dataclasses import dataclass

import structlog
from supabase import Client

from src.dam_client import DamClient
from src.parser import ParsedScore, parse_scoring_element
from src.session_boundary import group_into_sessions
from src import db

logger = structlog.get_logger(__name__)


@dataclass
class SyncResult:
    scores_fetched: int
    scores_new: int
    scores_skipped: int
    scores_failed: int
    sessions_created: int


def run_sync(
    sb: Client,
    user_id: str,
    cdm_card_no: str,
    *,
    gap_hours: float = 3.0,
    max_pages: int = 50,
    dry_run: bool = False,
) -> SyncResult:
    """Run a full sync for one user.

    Args:
        sb: Supabase client (service_role).
        user_id: Target auth.users.id.
        cdm_card_no: Plaintext DAM card number (decrypted upstream).
        gap_hours: Session boundary threshold.
        max_pages: Safety cap for API pagination.
        dry_run: If True, fetch and parse but skip all DB writes.
    """
    sync_log_id = None
    if not dry_run:
        sync_log_id = db.start_sync_log(sb, user_id)

    fetched = 0
    parsed_records: list[ParsedScore] = []
    failed = 0

    # ------ Fetch + Parse ------
    with DamClient(cdm_card_no) as client:
        for raw_record in client.iter_all(max_pages=max_pages, detail=True):
            fetched += 1
            try:
                parsed = parse_scoring_element(raw_record.element)
                parsed_records.append(parsed)
            except Exception as exc:
                failed += 1
                logger.error(
                    "parse_failed",
                    scoring_ai_id=raw_record.scoring_ai_id,
                    error=str(exc),
                )

    logger.info("fetch_complete", fetched=fetched, parsed=len(parsed_records), failed=failed)

    if dry_run:
        logger.warning("dry_run_mode", message="No DB writes performed")
        return SyncResult(
            scores_fetched=fetched,
            scores_new=0,
            scores_skipped=0,
            scores_failed=failed,
            sessions_created=0,
        )

    # ------ Sort and group ------
    parsed_records.sort(key=lambda s: s.sung_at)
    session_groups = group_into_sessions(parsed_records, gap_hours=gap_hours)

    # ------ Persist ------
    new_count = 0
    skipped_count = 0
    sessions_created = 0
    write_failed = 0

    for group in session_groups:
        # Try to find an existing session we can extend; otherwise create new
        try:
            session_id = db.find_session_covering(
                sb, user_id, group.started_at, gap_hours=gap_hours
            )
            if session_id is None:
                session_id = db.create_session(sb, user_id, group)
                sessions_created += 1
            else:
                # Extend end if this group pushes beyond it
                db.extend_session(sb, session_id, group.ended_at)
        except Exception as exc:
            logger.error("session_handling_failed", error=str(exc), started_at=group.started_at.isoformat())
            write_failed += len(group.scores)
            continue

        for parsed in group.scores:
            try:
                song_id = db.upsert_song(sb, parsed)
                result = db.insert_score(sb, user_id, song_id, session_id, parsed)
                if result.inserted:
                    new_count += 1
                    if parsed.pitch_intervals and result.score_id:
                        db.insert_pitch_intervals(
                            sb, user_id, result.score_id, parsed.pitch_intervals
                        )
                else:
                    skipped_count += 1
            except Exception as exc:
                write_failed += 1
                logger.error(
                    "score_write_failed",
                    dam_scoring_id=parsed.dam_scoring_id,
                    error=str(exc),
                )

    # ------ Finalize sync log ------
    total_failed = failed + write_failed
    final_status = "success" if total_failed == 0 else "partial" if new_count > 0 else "error"
    db.finish_sync_log(
        sb,
        sync_log_id,
        status=final_status,
        scores_fetched=fetched,
        scores_new=new_count,
        error_message=(f"{total_failed} records failed" if total_failed else None),
    )

    return SyncResult(
        scores_fetched=fetched,
        scores_new=new_count,
        scores_skipped=skipped_count,
        scores_failed=total_failed,
        sessions_created=sessions_created,
    )
