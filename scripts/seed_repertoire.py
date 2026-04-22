"""Seed User A's repertoire with 5 representative rows for UI verification.

Picks songs with varied max(total_score) so that ScoreBadge color tiers
(90+ neon-pink, 80-90 white, <80 dimmed) are all exercised. Sets varied
preferred_key, confidence, tags, and is_favorite so filter chips can be verified.

Idempotent: uses ON CONFLICT DO NOTHING on (user_id, song_id).

Run:  python scripts/seed_repertoire.py        # insert seed rows
      python scripts/seed_repertoire.py --wipe # remove all seed rows (memo='__seed__')
"""
from __future__ import annotations

import sys
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / ".env"

SEED_MEMO = "__seed__"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip()
    return env


def pick_candidate_songs(cur, user_id: str) -> list[tuple[str, float]]:
    """Return up to 5 (song_id, best_score) tuples spanning the three score tiers."""
    cur.execute(
        """
        SELECT song_id, MAX(total_score)::float AS best
        FROM scores
        WHERE user_id = %s
        GROUP BY song_id
        """,
        (user_id,),
    )
    all_rows = cur.fetchall()
    over90 = sorted([r for r in all_rows if r[1] >= 90], key=lambda r: -r[1])
    mid = sorted([r for r in all_rows if 80 <= r[1] < 90], key=lambda r: -r[1])
    low = sorted([r for r in all_rows if r[1] < 80], key=lambda r: -r[1])

    # Aim for 2x 90+, 2x 80-90, 1x <80
    picks: list[tuple[str, float]] = []
    picks.extend(over90[:2])
    picks.extend(mid[:2])
    picks.extend(low[:1])
    return picks


def seed(cur, user_id: str) -> int:
    songs = pick_candidate_songs(cur, user_id)
    if not songs:
        print("No scored songs found for user — cannot seed.", file=sys.stderr)
        return 0

    # Varied metadata per row index
    meta: list[dict] = [
        {"key": 0, "conf": "confident", "fav": True, "tags": ["J-POP", "十八番"]},
        {"key": -2, "conf": "normal", "fav": False, "tags": ["J-POP", "バラード"]},
        {"key": 2, "conf": "normal", "fav": False, "tags": ["アニソン", "盛り上げ"]},
        {"key": 0, "conf": "practicing", "fav": False, "tags": ["洋楽", "練習中"]},
        {"key": -1, "conf": "practicing", "fav": False, "tags": ["J-POP"]},
    ]

    inserted = 0
    for i, (song_id, _best) in enumerate(songs):
        m = meta[i % len(meta)]
        cur.execute(
            """
            INSERT INTO repertoire
              (user_id, song_id, preferred_key, confidence, tags, is_favorite, memo)
            VALUES (%s, %s, %s, %s::confidence_level, %s, %s, %s)
            ON CONFLICT (user_id, song_id) DO NOTHING
            """,
            (
                user_id,
                song_id,
                m["key"],
                m["conf"],
                m["tags"],
                m["fav"],
                SEED_MEMO,
            ),
        )
        inserted += cur.rowcount
    return inserted


def wipe(cur, user_id: str) -> int:
    cur.execute(
        "DELETE FROM repertoire WHERE user_id = %s AND memo = %s",
        (user_id, SEED_MEMO),
    )
    return cur.rowcount


def main() -> int:
    env = load_env()
    user_id = env.get("TARGET_USER_ID")
    if not user_id:
        print("TARGET_USER_ID missing in .env", file=sys.stderr)
        return 2
    conn = psycopg2.connect(env["SUPABASE_DB_URL"])
    try:
        with conn.cursor() as cur:
            if "--wipe" in sys.argv:
                n = wipe(cur, user_id)
                conn.commit()
                print(f"Removed {n} seed rows.")
            else:
                n = seed(cur, user_id)
                conn.commit()
                print(f"Inserted {n} seed repertoire rows for user {user_id[:8]}.")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
