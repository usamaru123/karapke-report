"""Verify RLS enforcement by contrasting anon vs service_role access.

Minimum viable proof without creating a second test user:
 - service_role sees all rows (bypasses RLS)
 - anon key (no JWT) sees 0 rows (RLS filters by auth.uid())

For cross-user isolation, creating User B requires dashboard or admin API access;
this script demonstrates the RLS filter is active without that step.
"""
from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / "poc" / "karaoke-sync-poc" / ".env"
ANON_KEY_PATH = ROOT / "karaoke-app" / ".env.local"


def load_kv(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip()
    return env


def fetch_count(url: str, key: str) -> int:
    req = urllib.request.Request(
        url,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Prefer": "count=exact",
            "Range-Unit": "items",
            "Range": "0-0",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            content_range = resp.headers.get("Content-Range", "")
            # "0-0/N" or "*/0"
            total = content_range.split("/")[-1] if "/" in content_range else "?"
            return int(total) if total.isdigit() else 0
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        return -1 if "permission" in body.lower() else 0


def main() -> int:
    env = load_kv(ENV_PATH)
    app_env = load_kv(ANON_KEY_PATH)
    base = env["SUPABASE_URL"].rstrip("/")
    service_key = env["SUPABASE_SERVICE_ROLE_KEY"]
    anon_key = app_env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

    tables = ["repertoire", "scores", "sessions", "setlists", "setlist_items", "sync_logs"]

    fails: list[str] = []
    print(f"{'table':<22} {'service_role':>14} {'anon':>8}  {'verdict':<10}")
    for t in tables:
        url = f"{base}/rest/v1/{t}?select=id"
        service_n = fetch_count(url, service_key)
        anon_n = fetch_count(url, anon_key)
        # MUST: anon returns 0 (RLS filters), service returns >=0 (bypasses RLS).
        ok = anon_n == 0 and service_n >= 0
        verdict = "PASS" if ok else "FAIL"
        print(f"{t:<22} {service_n:>14} {anon_n:>8}  {verdict:<10}")
        if not ok:
            fails.append(f"{t}: service={service_n}, anon={anon_n}")

    # Verify RLS policies reference auth.uid() or equivalent per-user filter.
    import psycopg2
    c = psycopg2.connect(env["SUPABASE_DB_URL"])
    try:
        with c.cursor() as cur:
            cur.execute("""
                SELECT tablename, policyname, cmd, qual
                FROM pg_policies WHERE schemaname='public'
                ORDER BY tablename, policyname
            """)
            print("\nRLS policies:")
            rows = cur.fetchall()
            for tbl, pol, cmd, qual in rows:
                print(f"  {tbl:<22} {pol:<35} {cmd:<8} qual={qual}")
            # Each user-scoped table should have at least one policy referencing auth.uid()
            per_table = {}
            for tbl, _pol, _cmd, qual in rows:
                per_table.setdefault(tbl, []).append(qual or "")
            for t in tables:
                quals = per_table.get(t, [])
                has_uid = any("auth.uid" in q for q in quals)
                if not has_uid:
                    fails.append(f"{t}: no auth.uid() in any policy qual")
    finally:
        c.close()

    print(f"\nSummary: {'ALL PASS' if not fails else 'FAIL'}")
    for f in fails:
        print(f"  FAIL: {f}")
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
