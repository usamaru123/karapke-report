"""DAM scoring Ai XML API client.

Fetches the user's scoring history from the undocumented DAM★とも endpoint:
    https://www.clubdam.com/app/damtomo/scoring/GetScoringAiListXML.do

Key characteristics of the API (confirmed empirically):
- Auth: none (cdmCardNo acts as a bearer token, but there's no additional auth)
- Pagination: 5 records per page via pageNo=N (1-indexed)
- Detail mode: detailFlg=1 returns the full 150+ attribute set per record
- Single record: scoringAiId=<id> fetches one record directly
- Max recorded: 200 per user (older records fall off)
- Rate limit: not explicitly documented; we apply conservative throttling
"""

from __future__ import annotations

import time
from collections.abc import Iterator
from dataclasses import dataclass

import httpx
import structlog
from lxml import etree
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

logger = structlog.get_logger(__name__)

DEFAULT_ENDPOINT = "https://www.clubdam.com/app/damtomo/scoring/GetScoringAiListXML.do"
DEFAULT_TIMEOUT = 15.0
DEFAULT_PAGE_SIZE = 5  # Fixed by the API
DEFAULT_MAX_PAGES = 50  # Safety cap (5 * 50 = 250 records, beyond the 200 limit)
REQUEST_INTERVAL_SEC = 0.5  # Throttle between requests


class DamApiError(Exception):
    """Raised when the DAM API returns an unexpected response."""


@dataclass(frozen=True)
class DamScoringRecord:
    """Raw XML element holder for a single scoring record.

    We keep the raw etree Element so callers can preserve the full XML and let
    the parser module extract structured fields. The scoring_ai_id is also
    surfaced here for logging and deduplication.
    """

    scoring_ai_id: str
    element: etree._Element


class DamClient:
    """HTTP client for the DAM scoring Ai XML API."""

    def __init__(
        self,
        cdm_card_no: str,
        endpoint: str = DEFAULT_ENDPOINT,
        timeout: float = DEFAULT_TIMEOUT,
        request_interval_sec: float = REQUEST_INTERVAL_SEC,
    ) -> None:
        if not cdm_card_no:
            raise ValueError("cdm_card_no must not be empty")
        self._cdm_card_no = cdm_card_no
        self._endpoint = endpoint
        self._timeout = timeout
        self._request_interval_sec = request_interval_sec
        # Persistent client lets us reuse connections and receive cookies
        self._client = httpx.Client(
            timeout=self._timeout,
            headers={
                "User-Agent": "karaoke-sync-poc/0.1 (+personal use)",
                "Accept": "application/xml, text/xml",
            },
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "DamClient":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    # ---------------------------------------------------------------
    # Low-level fetch
    # ---------------------------------------------------------------

    @retry(
        retry=retry_if_exception_type((httpx.HTTPError, DamApiError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        before_sleep=before_sleep_log(logger, "WARNING"),  # type: ignore[arg-type]
        reraise=True,
    )
    def _fetch_raw(self, params: dict[str, str]) -> bytes:
        """Issue a GET request with retries. Returns the raw response body.

        Retries on network errors and any 5xx. Throttles between calls to be
        polite to the server.
        """
        full_params = {"cdmCardNo": self._cdm_card_no, **params}
        logger.debug("dam_request", params={k: v for k, v in full_params.items() if k != "cdmCardNo"})

        resp = self._client.get(self._endpoint, params=full_params)
        if resp.status_code >= 500:
            raise DamApiError(f"DAM API returned HTTP {resp.status_code}")
        resp.raise_for_status()

        # Rate limit courtesy wait
        time.sleep(self._request_interval_sec)
        return resp.content

    @staticmethod
    def _parse_xml(raw: bytes) -> etree._Element:
        try:
            return etree.fromstring(raw)
        except etree.XMLSyntaxError as exc:
            raise DamApiError(f"Malformed XML from DAM API: {exc}") from exc

    # ---------------------------------------------------------------
    # High-level APIs
    # ---------------------------------------------------------------

    def fetch_page(self, page_no: int, detail: bool = True) -> list[DamScoringRecord]:
        """Fetch one page (5 records) of scoring history.

        Args:
            page_no: 1-indexed page number.
            detail: If True, request the detailed response (detailFlg=1).

        Returns:
            List of DamScoringRecord. Empty list means no more records.
        """
        params = {"pageNo": str(page_no)}
        if detail:
            params["detailFlg"] = "1"

        raw = self._fetch_raw(params)
        root = self._parse_xml(raw)

        # The actual structure (confirmed via live testing 2026-04):
        #   <document xmlns="https://www.clubdam.com/.../GetScoringAiListXML">
        #     <result><status>OK</status></result>
        #     <data><page>...</page><cdmCardNo>...</cdmCardNo></data>
        #     <list count="N">
        #       <data><scoring scoringAiId="..." .../></data>
        #       ...
        #     </list>
        #   </document>
        # Elements are in a default namespace, so we match by local-name.
        scorings = root.xpath("//*[local-name()='scoring']")
        records: list[DamScoringRecord] = []
        for el in scorings:
            scoring_ai_id = el.get("scoringAiId")
            if not scoring_ai_id:
                logger.warning("scoring_element_missing_id", xml=etree.tostring(el, encoding="unicode"))
                continue
            records.append(DamScoringRecord(scoring_ai_id=scoring_ai_id, element=el))
        logger.info("dam_page_fetched", page_no=page_no, count=len(records))
        return records

    def iter_all(
        self,
        max_pages: int = DEFAULT_MAX_PAGES,
        detail: bool = True,
    ) -> Iterator[DamScoringRecord]:
        """Iterate all available scoring records across pages.

        Stops when an empty page is returned (signaling end of history).

        Args:
            max_pages: Safety cap to prevent infinite loops.
            detail: Pass detailFlg=1 on each request.
        """
        for page_no in range(1, max_pages + 1):
            batch = self.fetch_page(page_no, detail=detail)
            if not batch:
                logger.info("dam_iteration_complete", final_page=page_no - 1)
                return
            yield from batch

    def fetch_single(self, scoring_ai_id: str, detail: bool = True) -> DamScoringRecord | None:
        """Fetch a specific scoring record by scoringAiId.

        Useful for filling in detail data for a record that was previously
        fetched without detailFlg, or re-fetching a specific record.
        """
        params = {"scoringAiId": scoring_ai_id}
        if detail:
            params["detailFlg"] = "1"
        raw = self._fetch_raw(params)
        root = self._parse_xml(raw)
        elements = root.xpath("//*[local-name()='scoring']")
        if not elements:
            logger.warning("dam_single_not_found", scoring_ai_id=scoring_ai_id)
            return None
        el = elements[0]
        return DamScoringRecord(scoring_ai_id=el.get("scoringAiId") or scoring_ai_id, element=el)
