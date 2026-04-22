import { notFound } from "next/navigation";
import { SetlistEditor } from "@/components/features/setlist/SetlistEditor";
import { getRepertoire } from "@/lib/queries/repertoire";
import { getSetlistDetail } from "@/lib/queries/setlists";
import { getUserVocalRange } from "@/lib/queries/user_range";

export default async function SetlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let setlist: Awaited<ReturnType<typeof getSetlistDetail>>;
  try {
    setlist = await getSetlistDetail(id);
  } catch {
    notFound();
  }

  const [repertoire, userRange] = await Promise.all([
    getRepertoire(),
    getUserVocalRange(),
  ]);

  return (
    <SetlistEditor
      setlist={setlist}
      repertoire={repertoire}
      userRange={userRange}
    />
  );
}
