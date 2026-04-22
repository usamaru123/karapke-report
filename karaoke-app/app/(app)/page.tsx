import { DashboardHeader } from "@/components/features/dashboard/DashboardHeader";
import { HeroCard } from "@/components/features/dashboard/HeroCard";
import { KpiGrid } from "@/components/features/dashboard/KpiGrid";
import { MonthlySummaryCard } from "@/components/features/dashboard/MonthlySummaryCard";
import { OnboardingBanner } from "@/components/features/dashboard/OnboardingBanner";
import { RecentScoreList } from "@/components/features/dashboard/RecentScoreList";
import {
  getDashboardSummary,
  getHeroBest,
  getRecentScores,
} from "@/lib/queries/dashboard";
import { getMonthlySummary } from "@/lib/queries/stats";
import { createClient } from "@/lib/supabase/server";

async function fetchProfile(): Promise<{
  displayName: string;
  hasCardNo: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { displayName: "ゲスト", hasCardNo: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, cdm_card_no")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ?? user.email?.split("@")[0] ?? "ゲスト";
  const hasCardNo =
    typeof profile?.cdm_card_no === "string" && profile.cdm_card_no.length >= 10;

  return { displayName, hasCardNo };
}

export default async function DashboardPage() {
  const [summary, hero, recent, profile, monthly] = await Promise.all([
    getDashboardSummary(),
    getHeroBest(),
    getRecentScores(5),
    fetchProfile(),
    getMonthlySummary(),
  ]);

  const lastSungAt = recent[0]?.sung_at ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-24 md:pb-6">
      <DashboardHeader
        displayName={profile.displayName}
        lastSungAt={lastSungAt}
      />
      {!profile.hasCardNo && <OnboardingBanner />}
      <HeroCard hero={hero} />
      <MonthlySummaryCard summary={monthly} />
      <KpiGrid summary={summary} />
      <RecentScoreList scores={recent} />
    </div>
  );
}
