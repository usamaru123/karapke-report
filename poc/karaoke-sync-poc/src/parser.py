"""XML → structured data conversion for DAM scoring records.

Responsibilities:
- Extract typed fields from a <scoring> XML element
- Convert raw XML to JSON (for storage in scores.raw_xml)
- Compute MIDI note values from DAM's existing representation
- Normalize datetime strings
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import structlog
import xmltodict
from lxml import etree
from pydantic import BaseModel, Field, field_validator

logger = structlog.get_logger(__name__)

JST = timezone.utc  # DAM returns UTC timestamps; adjust if needed later


# ---------------------------------------------------------------
# Pydantic models for structured score data
# ---------------------------------------------------------------


class ParsedScore(BaseModel):
    """Typed representation of a single scoring record.

    Field names mirror the `scores` table in schema.sql.
    """

    dam_scoring_id: str
    scoring_type: str  # ai / ai_heart / dxg / dx / other

    sung_at: datetime

    # Song identification
    song_title: str
    song_artist: str
    request_no: str | None = None
    dam_contents_id: str | None = None

    # Main score
    total_score: float

    # Radar (5 axes)
    pitch_score: float | None = None
    stability_score: float | None = None
    expression_score: float | None = None
    vibrato_longtone_score: float | None = None
    rhythm_score: float | None = None

    # Ai-specific
    ai_bonus: float | None = None

    # Performance context
    key_control: int = 0
    tempo_control: int | None = None
    guide_melody: bool | None = None

    # Range (MIDI note numbers)
    singing_range_lowest: int | None = None
    singing_range_highest: int | None = None
    vocal_range_lowest: int | None = None
    vocal_range_highest: int | None = None

    # 24-interval pitch data (only present when detailFlg=1)
    pitch_intervals: list[int] | None = None

    # Full XML as JSON for raw_xml column
    raw_xml: dict[str, Any]

    @field_validator("total_score", "pitch_score", "stability_score", "expression_score",
                     "vibrato_longtone_score", "rhythm_score", "ai_bonus", mode="before")
    @classmethod
    def _parse_float(cls, v: Any) -> float | None:
        if v is None or v == "":
            return None
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    @field_validator("key_control", "tempo_control", mode="before")
    @classmethod
    def _parse_int(cls, v: Any) -> int | None:
        if v is None or v == "":
            return None
        try:
            return int(v)
        except (TypeError, ValueError):
            return None

    @field_validator("singing_range_lowest", "singing_range_highest",
                     "vocal_range_lowest", "vocal_range_highest", mode="before")
    @classmethod
    def _parse_midi(cls, v: Any) -> int | None:
        if v is None or v == "":
            return None
        try:
            n = int(v)
            # Clamp to valid MIDI range (21-108 = piano range)
            if 21 <= n <= 108:
                return n
            return None
        except (TypeError, ValueError):
            return None


# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------


def _get_attr(el: etree._Element, name: str) -> str | None:
    v = el.get(name)
    return v if v else None


def _get_child_text(el: etree._Element, tag: str) -> str | None:
    child = el.find(tag)
    if child is None or child.text is None:
        return None
    text = child.text.strip()
    return text if text else None


def _parse_datetime(s: str | None) -> datetime | None:
    """Parse DAM's datetime format.

    DAM typically returns: "2026-04-18 11:36:42" (no timezone)
    We treat it as JST and store as UTC in DB via timestamptz.
    """
    if not s:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y%m%d%H%M%S"):
        try:
            return datetime.strptime(s.strip(), fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    logger.warning("datetime_parse_failed", value=s)
    return None


def _infer_scoring_type(el: etree._Element) -> str:
    """Infer the scoring machine type from XML attributes.

    DAM encodes this in various ways; normalize to our ENUM values.
    """
    # Common attribute names seen in responses
    for attr in ("scoringType", "type", "machineType"):
        val = el.get(attr)
        if val:
            v = val.lower()
            if "heart" in v:
                return "ai_heart"
            if "dxg" in v or "dx-g" in v or "dx_g" in v:
                return "dxg"
            if "dx" in v:
                return "dx"
            if "ai" in v:
                return "ai"
    # Default: assume Ai (this endpoint is scoring-Ai specific)
    return "ai"


def _parse_pitch_intervals(el: etree._Element) -> list[int] | None:
    """Extract the 24-section pitch scores from intervalGraphPointsSection01..24 attrs.

    Live DAM response (detailFlg=1) exposes each section as a separate attribute:
        intervalGraphPointsSection01="71" ... intervalGraphPointsSection24="35"
    """
    values: list[int] = []
    for i in range(1, 25):
        raw = el.get(f"intervalGraphPointsSection{i:02d}")
        if raw is None or raw == "":
            return None
        try:
            values.append(int(raw))
        except ValueError:
            return None
    return values if len(values) == 24 else None


# ---------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------


def _scaled(v: str | None, divisor: float) -> float | None:
    if v is None or v == "":
        return None
    try:
        return float(v) / divisor
    except (TypeError, ValueError):
        return None


def parse_scoring_element(el: etree._Element) -> ParsedScore:
    """Parse one <scoring> element into a ParsedScore.

    Attribute mapping is based on live DAM responses (verified 2026-04).
    The API is undocumented so we parse defensively (everything optional
    except the core identifiers and score).
    """
    scoring_ai_id = _get_attr(el, "scoringAiId")
    if not scoring_ai_id:
        raise ValueError("scoring element has no scoringAiId")

    # Sung time: `scoringDateTime` is YYYYMMDDHHMMSS
    sung_at_raw = (
        _get_attr(el, "scoringDateTime")
        or _get_attr(el, "scoringDate")
        or _get_child_text(el, "scoringDateTime")
        or _get_child_text(el, "scoringDate")
    )
    sung_at = _parse_datetime(sung_at_raw)
    if sung_at is None:
        raise ValueError(f"scoring {scoring_ai_id}: could not parse sung_at from '{sung_at_raw}'")

    # Song info
    song_title = (
        _get_attr(el, "contentsName")
        or _get_child_text(el, "contentsName")
        or _get_attr(el, "songName")
        or "(unknown)"
    )
    song_artist = (
        _get_attr(el, "artistName")
        or _get_child_text(el, "artistName")
        or "(unknown)"
    )

    # Total score is stored as the element text content (integer * 1000).
    # e.g. <scoring ...>90298</scoring> → 90.298
    # Fallback to legacy attribute names if format changes.
    total_raw = (el.text or "").strip() or None
    total_score = _scaled(total_raw, 1000.0)
    if total_score is None:
        # Legacy fallback
        total_score = _scaled(
            _get_attr(el, "scoringResult") or _get_attr(el, "totalScore"), 1000.0
        )

    # Serialize raw XML to JSON for storage
    raw_xml_str = etree.tostring(el, encoding="unicode")
    raw_xml_json = xmltodict.parse(raw_xml_str)

    return ParsedScore(
        dam_scoring_id=scoring_ai_id,
        scoring_type=_infer_scoring_type(el),
        sung_at=sung_at,
        song_title=song_title,
        song_artist=song_artist,
        request_no=_get_attr(el, "requestNo") or _get_child_text(el, "requestNo"),
        dam_contents_id=_get_attr(el, "contentsId") or _get_child_text(el, "contentsId"),
        total_score=total_score,  # validated in Pydantic
        # Radar: raw attrs are 0-100 integers, no scaling.
        pitch_score=_get_attr(el, "radarChartPitch"),
        stability_score=_get_attr(el, "radarChartStability"),
        expression_score=_get_attr(el, "radarChartExpressive"),
        vibrato_longtone_score=_get_attr(el, "radarChartVibratoLongtone"),
        rhythm_score=_get_attr(el, "radarChartRhythm"),
        # aiSensitivityBonus is integer * 1000 (e.g. 3723 → 3.723)
        ai_bonus=_scaled(_get_attr(el, "aiSensitivityBonus"), 1000.0),
        key_control=_get_attr(el, "lastPerformKey") or 0,
        tempo_control=_get_attr(el, "tempoControl"),
        guide_melody=(_get_attr(el, "guideMelody") == "1") if _get_attr(el, "guideMelody") else None,
        singing_range_lowest=_get_attr(el, "singingRangeLowest"),
        singing_range_highest=_get_attr(el, "singingRangeHighest"),
        vocal_range_lowest=_get_attr(el, "vocalRangeLowest"),
        vocal_range_highest=_get_attr(el, "vocalRangeHighest"),
        pitch_intervals=_parse_pitch_intervals(el),
        raw_xml=raw_xml_json,
    )


# ---------------------------------------------------------------
# MIDI utilities (exposed for the app)
# ---------------------------------------------------------------


NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def midi_to_note_name(midi: int) -> str:
    """Convert MIDI note number to note name (e.g. 60 -> 'C4')."""
    if not (21 <= midi <= 108):
        return f"?({midi})"
    octave = (midi // 12) - 1
    name = NOTE_NAMES[midi % 12]
    return f"{name}{octave}"
