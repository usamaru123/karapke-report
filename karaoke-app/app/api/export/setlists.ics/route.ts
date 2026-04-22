import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * iCalendar feed of all setlists with a `scheduled_for` date.
 *
 * Design choices:
 *   - One all-day VEVENT per setlist (no time component — we don't track it)
 *   - DTSTART/DTEND as DATE values per RFC 5545 §3.6.1 ("all-day")
 *   - UID stable across re-export so re-importing updates the same event
 *   - DESCRIPTION lists the first 5 songs + count; long descriptions get
 *     trimmed to respect the 75-octet line rule (we let calendar apps fold
 *     lines themselves and simply avoid embedding newlines in the payload)
 */

function icsEscape(s: string): string {
  // RFC 5545: escape \, ;, , and newlines inside TEXT properties.
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function ymdNoHyphen(ymd: string): string {
  return ymd.replace(/-/g, "");
}

function nextDay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("setlists")
    .select(
      `
      id, name, scheduled_for, created_at, updated_at, memo,
      items:setlist_items(position, song:songs(title, artist))
    `,
    )
    .eq("is_template", false)
    .not("scheduled_for", "is", null)
    .order("scheduled_for", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Item = { position: number; song: { title: string; artist: string } | null };
  type Row = {
    id: string;
    name: string;
    scheduled_for: string;
    created_at: string;
    updated_at: string;
    memo: string | null;
    items: Item[];
  };
  const rows = (data ?? []) as unknown as Row[];

  // Build an ISO-ish timestamp for DTSTAMP (required, UTC in basic format).
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}T${String(now.getUTCHours()).padStart(2, "0")}${String(now.getUTCMinutes()).padStart(2, "0")}${String(now.getUTCSeconds()).padStart(2, "0")}Z`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//karapke-report//setlist-export//JA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:カラオケ予定",
  ];

  for (const r of rows) {
    const sortedItems = [...r.items].sort((a, b) => a.position - b.position);
    const songLines = sortedItems
      .slice(0, 5)
      .map(
        (it, i) =>
          `${i + 1}. ${it.song?.title ?? "(no title)"} / ${it.song?.artist ?? "(no artist)"}`,
      );
    const more = sortedItems.length - 5;
    const descParts = [
      `全 ${sortedItems.length} 曲`,
      ...songLines,
      more > 0 ? `…他 ${more} 曲` : null,
      r.memo ? `\nメモ: ${r.memo}` : null,
    ].filter((v): v is string => typeof v === "string");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:setlist-${r.id}@karapke-report`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${ymdNoHyphen(r.scheduled_for)}`);
    lines.push(`DTEND;VALUE=DATE:${ymdNoHyphen(nextDay(r.scheduled_for))}`);
    lines.push(`SUMMARY:${icsEscape(r.name)}`);
    lines.push(`DESCRIPTION:${icsEscape(descParts.join("\n"))}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // CRLF per spec. No BOM (ICS is 7-bit ASCII-compatible but UTF-8 is widely OK).
  const body = lines.join("\r\n") + "\r\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="karaoke_setlists.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
