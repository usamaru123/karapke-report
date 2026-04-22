import { ExternalLink } from "lucide-react";
import { CardNoForm } from "@/components/features/settings/CardNoForm";
import { SignOutButton } from "@/components/features/settings/SignOutButton";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let cardNo: string | null = null;
  if (user) {
    // RLS allows the user to read their own profile; service_role not needed here.
    const { data } = await supabase
      .from("profiles")
      .select("cdm_card_no")
      .eq("id", user.id)
      .maybeSingle();
    cardNo = data?.cdm_card_no ?? null;
  }

  const hasCardNo = typeof cardNo === "string" && cardNo.length >= 10;
  const maskedSuffix =
    hasCardNo && cardNo ? cardNo.slice(-4) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 pt-6 pb-24 md:pb-6">
      <header>
        <h1 className="text-xl font-semibold text-white">設定</h1>
        <p className="mt-1 text-xs text-white/50">
          サインイン中: {user?.email ?? "—"}
        </p>
      </header>

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
