import { format, formatDistanceToNowStrict } from "date-fns";
import { ja } from "date-fns/locale";

export function formatScore(v: number | string | null): string {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(3);
}

export function formatKey(n: number): string {
  if (n === 0) return "原キー";
  return n > 0 ? `+${n}` : `${n}`;
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "M/d", { locale: ja });
}

export function formatRelativeJa(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDistanceToNowStrict(d, { addSuffix: true, locale: ja });
}
