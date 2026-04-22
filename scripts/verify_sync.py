"""Verify P1-06 (production sync) and P1-07 (idempotency) DB state."""
from __future__ import annotations

import sys
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / ".env"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip()
    return env


def main() -> int:
    env = load_env()
    conn = psycopg2.connect(env["SUPABASE_DB_URL"])
    try:
        with conn.cursor() as cur:
            checks: list[tuple[str, str, str]] = [
                ("MUST", "scores_count",
                 "SELECT COUNT(*) FROM scores"),
                ("MUST", "songs_count",
                 "SELECT COUNT(*) FROM songs"),
                ("MUST", "sessions_count",
                 "SELECT COUNT(*) FROM sessions"),
                ("MUST", "sync_logs_success",
                 "SELECT COUNT(*) FROM sync_logs WHERE status IN ('success','partial')"),
                ("SHOULD", "scores_with_vocal_range",
                 "SELECT COUNT(*) FROM scores WHERE vocal_range_highest IS NOT NULL"),
                ("SHOULD", "songs_with_vocal_range",
                 "SELECT COUNT(*) FROM songs WHERE vocal_range_highest IS NOT NULL"),
                ("SHOULD", "sessions_avg_score_count",
                 "SELECT AVG(score_count)::float FROM sessions"),
                ("INFO", "sample_score",
                 "SELECT dam_scoring_id, song_title, total_score, pitch_score, rhythm_score, "
                 "vocal_range_lowest, vocal_range_highest FROM scores ORDER BY sung_at DESC LIMIT 1"),
                ("INFO", "distinct_songs",
                 "SELECT COUNT(DISTINCT (title, artist)) FROM songs"),
                ("INFO", "pitch_intervals_rows",
                 "SELECT COUNT(*) FROM score_pitch_intervals"),
            ]
            for level, name, sql in checks:
                cur.execute(sql)
                rows = cur.fetchall()
                print(f"[{level}] {name}: {rows[0] if len(rows)==1 else rows}")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
