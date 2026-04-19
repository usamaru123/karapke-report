import { DashboardHeader } from "@/components/features/dashboard/DashboardHeader";
import { HeroCard } from "@/components/features/dashboard/HeroCard";
import { KpiGrid } from "@/components/features/dashboard/KpiGrid";
import { RecentScoreList } from "@/components/features/dashboard/RecentScoreList";
import { SyncCard } from "@/components/features/dashboard/SyncCard";
import {
  getDashboardSummary,
  getHeroBest,
  getRecentScores,
} from "@/lib/queries/dashboard";
import { createClient } from "@/lib/supabase/server";

async function fetchDisplayName(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "ゲスト";

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.display_name) return profile.display_name;
  // Fallback to the email local part
  return user.email?.split("@")[0] ?? "ゲスト";
}

export default async function DashboardPage() {
  const [summary, hero, recent, displayName] = await Promise.all([
    getDashboardSummary(),
    getHeroBest(),
    getRecentScores(5),
    fetchDisplayName(),
  ]);

  const lastSungAt = recent[0]?.sung_at ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-24 md:pb-6">
      <DashboardHeader displayName={displayName} lastSungAt={lastSungAt} />
      <HeroCard hero={hero} />
      <KpiGrid summary={summary} />
      <RecentScoreList scores={recent} />
      <SyncCard lastSyncAt={summary.lastSyncAt} />
    </div>
  );
}
