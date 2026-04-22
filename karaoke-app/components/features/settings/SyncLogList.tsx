import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { AlertTriangle, Check, Clock } from "lucide-react";
import {
  formatSyncDuration,
  getSyncStatusMeta,
} from "@/lib/format/sync-log";
import type { SyncLogRow } from "@/lib/queries/sync_logs";

type Props = { logs: SyncLogRow[] };

const ICONS = {
  check: Check,
  alert: AlertTriangle,
  clock: Clock,
} as const;

export function SyncLogList({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <p className="rounded-lg border border-white/10 bg-bg-surface px-4 py-8 text-center text-sm text-white/50">
        まだ同期ログがありません。
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {logs.map((log) => {
        const meta = getSyncStatusMeta(log.status);
        const Icon = ICONS[meta.iconKey];
        const startedAt = new Date(log.started_at);
        return (
          <li
            key={log.id}
            className="rounded-lg border border-white/10 bg-bg-surface p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon size={14} className={meta.colorClass} />
                  <span className={`text-xs font-semibold ${meta.colorClass}`}>
                    {meta.label}
                  </span>
                  <span className="text-[11px] text-white/40 tabular-nums">
                    {format(startedAt, "M/d HH:mm", { locale: ja })}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/60 tabular-nums">
                  <span>取得: {log.scores_fetched ?? "—"}</span>
                  <span>新規: {log.scores_new ?? "—"}</span>
                  <span>
                    所要: {formatSyncDuration(log.started_at, log.finished_at)}
                  </span>
                </div>
                {log.error_message && (
                  <p className="mt-2 break-words rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-300">
                    {log.error_message}
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
