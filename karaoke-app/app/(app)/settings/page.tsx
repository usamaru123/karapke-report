import { ExternalLink, FileClock } from "lucide-react";
import Link from "next/link";
import { CardNoForm } from "@/components/features/settings/CardNoForm";
import { DisplayNameForm } from "@/components/features/settings/DisplayNameForm";
import { SignOutButton } from "@/components/features/settings/SignOutButton";
import { SyncCard } from "@/components/features/dashboard/SyncCard";
import { getDashboardSummary } from "@/lib/queries/dashboard";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let cardNo: string | null = null;
  let displayName: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("cdm_card_no, display_name")
      .eq("id", user.id)
      .maybeSingle();
    cardNo = data?.cdm_card_no ?? null;
    displayName = data?.display_name ?? null;
  }

  const hasCardNo = typeof cardNo === "string" && cardNo.length >= 10;
  const maskedSuffix =
    hasCardNo && cardNo ? cardNo.slice(-4) : null;

  const summary = await getDashboardSummary();

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 pt-6 pb-24 md:pb-6">
      <header>
        <h1 className="text-xl font-semibold text-white">設定</h1>
        <p className="mt-1 text-xs text-white/50">
          サインイン中: {user?.email ?? "—"}
        </p>
      </header>

      <section>
        <h2 className="text-sm font-semibold text-white">表示名</h2>
        <p className="mt-1 text-xs text-white/60">
          ダッシュボード冒頭の挨拶などに使用されます。未設定時は email のローカル部が使われます。
        </p>
        <div className="mt-3">
          <DisplayNameForm initial={displayName} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-white">DAM カード番号</h2>
        <p className="mt-1 text-xs text-white/60">
          DAM★とも の cdmCardNo (20 文字の base64) を登録すると、定期同期で自動取り込みされます。
        </p>
        <a
          href="https://www.clubdam.com/app/damtomo/scoring/"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-neon-cyan hover:underline"
        >
          取得方法を開く
          <ExternalLink size={11} />
        </a>

        <div className="mt-4">
          <CardNoForm hasCardNo={hasCardNo} maskedSuffix={maskedSuffix} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-white">同期</h2>
        <p className="mt-1 text-xs text-white/60">
          自動で毎日 12:00 頃 (JST) に取り込まれます。手動で今すぐ取り込みたい場合:
        </p>
        <div className="mt-3">
          <SyncCard lastSyncAt={summary.lastSyncAt} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-white">同期ログ</h2>
        <p className="mt-1 text-xs text-white/60">
          定期同期の成功/失敗履歴を確認できます。
        </p>
        <Link
          href="/settings/sync-logs"
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-white/10 bg-bg-surface px-3 py-2 text-xs text-white/80 hover:bg-white/5"
        >
          <FileClock size={13} />
          同期ログを開く
        </Link>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-white">アカウント</h2>
        <p className="mt-1 text-xs text-white/60">
          サインアウトすると次回アクセス時に再ログインが必要になります。
        </p>
        <div className="mt-3">
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
