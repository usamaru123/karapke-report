"""CLI entry point for DAM scoring sync.

Usage:
    # Normal incremental sync
    python scripts/sync_scores.py sync

    # Dry run (fetch + parse but don't write)
    python scripts/sync_scores.py sync --dry-run

    # Wipe all user data and re-import from scratch (DEBUG)
    python scripts/sync_scores.py init

    # Fetch one specific score by id
    python scripts/sync_scores.py show-one <scoring_ai_id>
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

import click
import structlog
from dotenv import load_dotenv
from lxml import etree

# Make src importable when running as a script
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.dam_client import DamClient
from src.db import make_client, wipe_user_scores
from src.parser import midi_to_note_name, parse_scoring_element
from src.sync import run_sync


def _configure_logging(level: str) -> None:
    logging.basicConfig(level=getattr(logging, level.upper(), logging.INFO))
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer(colors=True),
        ]
    )


def _load_env() -> dict[str, str]:
    load_dotenv()
    required = {
        "DAM_CDM_CARD_NO": os.getenv("DAM_CDM_CARD_NO", ""),
        "SUPABASE_URL": os.getenv("SUPABASE_URL", ""),
        "SUPABASE_SERVICE_ROLE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        "TARGET_USER_ID": os.getenv("TARGET_USER_ID", ""),
    }
    missing = [k for k, v in required.items() if not v]
    if missing:
        click.echo(f"ERROR: Missing env vars: {', '.join(missing)}", err=True)
        click.echo("Copy .env.example to .env and fill in the values.", err=True)
        sys.exit(1)
    required["SESSION_GAP_HOURS"] = os.getenv("SESSION_GAP_HOURS", "3")
    required["LOG_LEVEL"] = os.getenv("LOG_LEVEL", "INFO")
    return required


# ---------------------------------------------------------------
# Commands
# ---------------------------------------------------------------


@click.group()
def cli() -> None:
    """DAM scoring sync tool."""


@cli.command()
@click.option("--dry-run", is_flag=True, help="Fetch and parse but do not write to DB.")
@click.option("--max-pages", default=50, help="Safety cap for API pagination.")
def sync(dry_run: bool, max_pages: int) -> None:
    """Fetch DAM scoring history and upsert into Supabase (idempotent)."""
    env = _load_env()
    _configure_logging(env["LOG_LEVEL"])

    sb = make_client(env["SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
    result = run_sync(
        sb,
        user_id=env["TARGET_USER_ID"],
        cdm_card_no=env["DAM_CDM_CARD_NO"],
        gap_hours=float(env["SESSION_GAP_HOURS"]),
        max_pages=max_pages,
        dry_run=dry_run,
    )

    click.echo("")
    click.echo("=== Sync Result ===")
    click.echo(f"  Fetched:    {result.scores_fetched}")
    click.echo(f"  New:        {result.scores_new}")
    click.echo(f"  Skipped:    {result.scores_skipped} (already in DB)")
    click.echo(f"  Failed:     {result.scores_failed}")
    click.echo(f"  Sessions:   {result.sessions_created} created")


@cli.command()
@click.option("--yes", is_flag=True, help="Skip confirmation prompt.")
def init(yes: bool) -> None:
    """DESTRUCTIVE: Wipe the target user's scoring data, then re-import.

    Useful during development when parser logic changes and you need a clean
    slate. songs catalog is NOT deleted (it's shared).
    """
    env = _load_env()
    _configure_logging(env["LOG_LEVEL"])

    target = env["TARGET_USER_ID"]
    click.echo(f"This will DELETE all scores/sessions/sync_logs for user {target}")
    if not yes:
        if not click.confirm("Continue?"):
            click.echo("Aborted.")
            sys.exit(0)

    sb = make_client(env["SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])

    click.echo("Wiping user data...")
    deleted = wipe_user_scores(sb, target)
    click.echo(f"  Deleted: {deleted}")

    click.echo("\nRe-importing from DAM...")
    result = run_sync(
        sb,
        user_id=target,
        cdm_card_no=env["DAM_CDM_CARD_NO"],
        gap_hours=float(env["SESSION_GAP_HOURS"]),
    )

    click.echo("")
    click.echo("=== Init Result ===")
    click.echo(f"  Fetched:    {result.scores_fetched}")
    click.echo(f"  New:        {result.scores_new}")
    click.echo(f"  Sessions:   {result.sessions_created}")


@cli.command(name="show-one")
@click.argument("scoring_ai_id")
def show_one(scoring_ai_id: str) -> None:
    """Fetch one specific score by scoring_ai_id and print parsed fields.

    Useful for debugging parser logic without writing to DB.
    """
    env = _load_env()
    _configure_logging(env["LOG_LEVEL"])

    with DamClient(env["DAM_CDM_CARD_NO"]) as client:
        record = client.fetch_single(scoring_ai_id)
        if record is None:
            click.echo(f"Not found: {scoring_ai_id}")
            sys.exit(1)

        parsed = parse_scoring_element(record.element)

    click.echo(f"  scoring_ai_id:        {parsed.dam_scoring_id}")
    click.echo(f"  scoring_type:         {parsed.scoring_type}")
    click.echo(f"  sung_at:              {parsed.sung_at.isoformat()}")
    click.echo(f"  song:                 {parsed.song_title} / {parsed.song_artist}")
    click.echo(f"  request_no:           {parsed.request_no}")
    click.echo(f"  total_score:          {parsed.total_score}")
    click.echo(f"  key_control:          {parsed.key_control:+d}")
    click.echo(f"  radar: pitch={parsed.pitch_score} stab={parsed.stability_score} "
               f"expr={parsed.expression_score} vib={parsed.vibrato_longtone_score} "
               f"rhythm={parsed.rhythm_score}")
    if parsed.vocal_range_lowest and parsed.vocal_range_highest:
        click.echo(f"  song range:           {midi_to_note_name(parsed.vocal_range_lowest)} - "
                   f"{midi_to_note_name(parsed.vocal_range_highest)}")
    if parsed.singing_range_lowest and parsed.singing_range_highest:
        click.echo(f"  sang range:           {midi_to_note_name(parsed.singing_range_lowest)} - "
                   f"{midi_to_note_name(parsed.singing_range_highest)}")
    if parsed.pitch_intervals:
        click.echo(f"  pitch_intervals:      {parsed.pitch_intervals}")


@cli.command(name="show-xml")
@click.argument("scoring_ai_id")
def show_xml(scoring_ai_id: str) -> None:
    """Print the raw XML for one scoring_ai_id (debugging parser issues)."""
    env = _load_env()
    _configure_logging(env["LOG_LEVEL"])

    with DamClient(env["DAM_CDM_CARD_NO"]) as client:
        record = client.fetch_single(scoring_ai_id)
        if record is None:
            click.echo(f"Not found: {scoring_ai_id}")
            sys.exit(1)
        click.echo(etree.tostring(record.element, encoding="unicode", pretty_print=True))


if __name__ == "__main__":
    cli()
