import { redirect } from "next/navigation";
import { GlobalAddFab } from "@/components/features/repertoire/GlobalAddFab";
import { BottomNav } from "@/components/navigation/BottomNav";
import { SideNav } from "@/components/navigation/SideNav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-bg-base text-white">
      <SideNav />
      <main className="pb-20 md:ml-56 md:pb-0">{children}</main>
      <GlobalAddFab />
      <BottomNav />
    </div>
  );
}
