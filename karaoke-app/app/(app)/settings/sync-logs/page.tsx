import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { SyncLogList } from "@/components/features/settings/SyncLogList";
import { getRecentSyncLogs } from "@/lib/queries/sync_logs";

export const metadata = {
  title: "同期ログ | カラオケレパ",
};

export default async function SyncLogsPage() {
  const logs = await getRecentSyncLogs(30);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4 pb-24 md:pb-6">
      <header className="flex items-center gap-2">
        <Link
          href="/settings"
          aria-label="設定に戻る"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:bg-white/5 hover:text-white"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-lg font-semibold text-white">同期ログ</h1>
      </header>

      <p className="text-xs text-white/50">
        直近 30 件の定期同期 (cron) 実行結果。
      </p>

      <SyncLogList logs={logs} />
    </div>
  );
}
