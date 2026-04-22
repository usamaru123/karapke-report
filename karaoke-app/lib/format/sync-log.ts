/**
 * Formatting helpers for sync_logs rows. Extracted from the SyncLogList
 * component so the logic can be unit-tested without React / icons in scope.
 */

export type SyncStatusMeta = {
  /** Tailwind text color utility to apply. */
  colorClass: string;
  /** Japanese label shown next to the icon. */
  label: string;
  /** Identifier the component uses to pick the matching lucide icon. */
  iconKey: "check" | "alert" | "clock";
};

export function getSyncStatusMeta(status: string): SyncStatusMeta {
  // The Edge Function writes: 'running' | 'success' | 'failed' | 'no_card_no'.
  // Unknown statuses fall through to a neutral "clock" visual with the raw
  // status string as the label so operators can still debug.
  switch (status) {
    case "success":
      return { colorClass: "text-neon-green", label: "成功", iconKey: "check" };
    case "failed":
      return { colorClass: "text-red-400", label: "失敗", iconKey: "alert" };
    case "running":
      return {
        colorClass: "text-neon-cyan",
        label: "実行中",
        iconKey: "clock",
      };
    case "no_card_no":
      return {
        colorClass: "text-neon-amber",
        label: "カード番号未登録",
        iconKey: "alert",
      };
    default:
      return { colorClass: "text-white/60", label: status, iconKey: "clock" };
  }
}

/**
 * Human-readable elapsed-time between `startedAt` and `finishedAt`.
 *
 * Returns "—" when:
 *   - finishedAt is null (still running or crashed before write-back)
 *   - inputs are unparseable
 *   - the delta is negative (clock skew / reversed arguments)
 */
export function formatSyncDuration(
  startedAt: string,
  finishedAt: string | null,
): string {
  if (!finishedAt) return "—";
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)} 秒`;
  const min = Math.floor(sec / 60);
  const rem = Math.round(sec % 60);
  return `${min} 分 ${rem} 秒`;
}
