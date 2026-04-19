"""Apply sql/schema.sql to Supabase and verify P1-02 MUST conditions."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg2
from psycopg2.extensions import connection as Connection

ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / "poc" / "karaoke-sync-poc" / ".env"
SCHEMA_PATH = ROOT / "sql" / "schema.sql"


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip()
    return env


MUST_CHECKS: list[tuple[str, str, int]] = [
    (
        "tables_count",
        """
        SELECT COUNT(*)::int FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'profiles','songs','sessions','scores','score_pitch_intervals',
            'repertoire','setlists','setlist_items','sync_logs'
          )
        """,
        9,
    ),
    (
        "enums_count",
        """
        SELECT COUNT(*)::int FROM pg_type
        WHERE typname IN ('confidence_level','range_source','scoring_type')
        """,
        3,
    ),
    (
        "rls_policies_min10",
        """
        SELECT COUNT(*)::int FROM pg_policies WHERE schemaname = 'public'
        """,
        10,  # MUST: >= 10
    ),
    (
        "triggers_count",
        """
        SELECT COUNT(*)::int FROM pg_trigger WHERE tgname IN (
          'scores_session_stats','scores_update_song_range',
          'profiles_updated_at','songs_updated_at','sessions_updated_at',
          'repertoire_updated_at','setlists_updated_at'
        )
        """,
        7,
    ),
    (
        "functions_count",
        """
        SELECT COUNT(*)::int FROM pg_proc
        WHERE proname IN ('set_my_cdm_card_no','get_cdm_card_no_for')
        """,
        2,
    ),
]

SHOULD_CHECKS: list[tuple[str, str]] = [
    (
        "scores_has_indexes",
        "SELECT (pg_indexes_size('public.scores') IS NOT NULL)::int",
    ),
]


def apply_schema(conn: Connection, sql_text: str) -> None:
    with conn.cursor() as cur:
        cur.execute(sql_text)
    conn.commit()


def verify(conn: Connection) -> tuple[list[str], list[str]]:
    passes: list[str] = []
    fails: list[str] = []
    with conn.cursor() as cur:
        for name, sql, expected in MUST_CHECKS:
            cur.execute(sql)
            row = cur.fetchone()
            got = row[0] if row else None
            if name == "rls_policies_min10":
                ok = got is not None and got >= expected
                detail = f"{got} >= {expected}"
            else:
                ok = got == expected
                detail = f"{got} == {expected}"
            line = f"[{'PASS' if ok else 'FAIL'}] MUST {name}: {detail}"
            print(line)
            (passes if ok else fails).append(line)
        for name, sql in SHOULD_CHECKS:
            cur.execute(sql)
            row = cur.fetchone()
            got = row[0] if row else None
            print(f"[INFO] SHOULD {name}: {got}")
    return passes, fails


def main() -> int:
    if not ENV_PATH.exists():
        print(f"ENV not found: {ENV_PATH}", file=sys.stderr)
        return 2
    env = load_env(ENV_PATH)
    db_url = env.get("SUPABASE_DB_URL")
    if not db_url:
        print("SUPABASE_DB_URL missing in .env", file=sys.stderr)
        return 2
    sql_text = SCHEMA_PATH.read_text(encoding="utf-8")
    skip_apply = "--verify-only" in sys.argv
    print(f"Connecting to Supabase DB...")
    conn = psycopg2.connect(db_url)
    try:
        if not skip_apply:
            print(f"Applying schema ({SCHEMA_PATH})...")
            try:
                apply_schema(conn, sql_text)
                print("Schema applied successfully.")
            except psycopg2.errors.DuplicateObject as e:
                conn.rollback()
                print(f"Schema already applied (DuplicateObject: {e}). Skipping apply, verifying only.")
        print("Verifying...")
        passes, fails = verify(conn)
        print(f"\nSummary: {len(passes)} PASS, {len(fails)} FAIL")
        return 0 if not fails else 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
