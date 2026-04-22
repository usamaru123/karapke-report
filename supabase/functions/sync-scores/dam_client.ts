/**
 * DAM scoring Ai XML API client (Deno port of poc/karaoke-sync-poc/src/dam_client.py).
 *
 * Endpoint:
 *   https://www.clubdam.com/app/damtomo/scoring/GetScoringAiListXML.do
 * Observed behavior (Phase 1 live test):
 *   - 5 records per page
 *   - detailFlg=1 returns the full attribute set
 *   - empty page signals end of history
 *   - max 200 records retained server-side
 */

import { XMLParser } from "fast-xml-parser";
import { ATTR_PREFIX, TEXT_NODE } from "./parser.ts";

const DEFAULT_ENDPOINT =
  "https://www.clubdam.com/app/damtomo/scoring/GetScoringAiListXML.do";
const DEFAULT_TIMEOUT_MS = 15_000;
const REQUEST_INTERVAL_MS = 500; // courtesy throttle between pages
const DEFAULT_MAX_PAGES = 50; // safety cap (5 * 50 > 200 DAM ceiling)

export type DamRecord = {
  scoring_ai_id: string;
  /** xml-as-json representation of the <scoring> element */
  element: Record<string, unknown>;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ATTR_PREFIX,
  textNodeName: TEXT_NODE,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: false,
  // Force <scoring> and the inner <data> wrappers to parse as arrays so that
  // single-element pages still yield a list we can iterate uniformly.
  isArray: (name, jpath) => {
    return jpath === "document.list.data" || name === "scoring";
  },
});

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchRaw(
  endpoint: string,
  params: Record<string, string>,
  timeoutMs: number,
): Promise<string> {
  const url = new URL(endpoint);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "karaoke-sync-edge/0.1 (+personal use)",
        Accept: "application/xml, text/xml",
      },
    });
    if (!res.ok) {
      throw new Error(`DAM API HTTP ${res.status}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extract all <scoring> elements from the parsed XML doc regardless of where
 * they sit in the tree. Handles the structure:
 *   <document><list count="N"><data><scoring .../></data>...</list></document>
 */
function extractScorings(doc: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  function visit(v: unknown) {
    if (v === null || typeof v !== "object") return;
    if (Array.isArray(v)) {
      for (const x of v) visit(x);
      return;
    }
    const obj = v as Record<string, unknown>;
    for (const [k, val] of Object.entries(obj)) {
      if (k === "scoring") {
        if (Array.isArray(val)) {
          for (const el of val) out.push(el as Record<string, unknown>);
        } else if (val && typeof val === "object") {
          out.push(val as Record<string, unknown>);
        }
      } else {
        visit(val);
      }
    }
  }
  visit(doc);
  return out;
}

export class DamClient {
  constructor(
    private readonly cdmCardNo: string,
    private readonly endpoint: string = DEFAULT_ENDPOINT,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {
    if (!cdmCardNo) throw new Error("cdmCardNo must not be empty");
  }

  async fetchPage(pageNo: number, detail = true): Promise<DamRecord[]> {
    const params: Record<string, string> = {
      cdmCardNo: this.cdmCardNo,
      pageNo: String(pageNo),
    };
    if (detail) params.detailFlg = "1";
    const xml = await fetchRaw(this.endpoint, params, this.timeoutMs);
    await sleep(REQUEST_INTERVAL_MS);
    const doc = parser.parse(xml);
    const scorings = extractScorings(doc);
    const out: DamRecord[] = [];
    for (const el of scorings) {
      const id = el[`${ATTR_PREFIX}scoringAiId`];
      if (id) {
        out.push({ scoring_ai_id: String(id), element: el });
      }
    }
    return out;
  }

  async *iterAll(
    maxPages: number = DEFAULT_MAX_PAGES,
    detail = true,
  ): AsyncIterable<DamRecord> {
    for (let page = 1; page <= maxPages; page++) {
      const batch = await this.fetchPage(page, detail);
      if (batch.length === 0) return;
      for (const rec of batch) yield rec;
    }
  }
}
