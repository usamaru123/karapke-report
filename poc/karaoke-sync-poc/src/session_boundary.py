"""Session boundary detection.

A karaoke "session" is a contiguous block of songs sung at one visit.
Two scores belong to the same session if their sung_at timestamps are within
a configurable gap (default 3 hours).
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass
class SessionGroup:
    """A group of scores identified as belonging to one session."""

    started_at: datetime
    ended_at: datetime
    scores: list  # list of ParsedScore (avoid circular import; typed loosely)

    @property
    def score_count(self) -> int:
        return len(self.scores)


def group_into_sessions(
    sorted_scores: Iterable,  # Iterable[ParsedScore], sorted by sung_at ascending
    gap_hours: float = 3.0,
) -> list[SessionGroup]:
    """Group scores into sessions based on time gaps.

    Input MUST be sorted by sung_at ascending. Returns a list of SessionGroup
    in the same chronological order.

    Args:
        sorted_scores: Scores in chronological order (oldest first).
        gap_hours: Max gap between consecutive scores in the same session.

    Returns:
        List of SessionGroup.
    """
    gap = timedelta(hours=gap_hours)
    groups: list[SessionGroup] = []
    current: list = []

    for score in sorted_scores:
        if not current:
            current.append(score)
            continue

        prev_score = current[-1]
        if score.sung_at - prev_score.sung_at <= gap:
            current.append(score)
        else:
            # Close current group
            groups.append(_finalize(current))
            current = [score]

    if current:
        groups.append(_finalize(current))

    return groups


def _finalize(scores: list) -> SessionGroup:
    return SessionGroup(
        started_at=scores[0].sung_at,
        ended_at=scores[-1].sung_at,
        scores=scores,
    )
