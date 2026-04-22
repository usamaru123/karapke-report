/**
 * Minimal RFC 4180 CSV serializer. We avoid pulling in a library because we
 * only have 3 callers (scores/repertoire/setlists export). Handles embedded
 * quotes, commas and newlines by quoting when any of those appear. BOM is
 * prepended so Excel on Windows opens UTF-8 correctly.
 */

function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : String(v);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; header: string }[],
): string {
  const headerLine = columns.map((c) => escapeCell(c.header)).join(",");
  const lines = rows.map((r) =>
    columns.map((c) => escapeCell(r[c.key])).join(","),
  );
  // \uFEFF BOM so Excel autodetects UTF-8.
  return "\uFEFF" + [headerLine, ...lines].join("\r\n") + "\r\n";
}
