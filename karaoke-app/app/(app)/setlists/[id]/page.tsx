import { notFound } from "next/navigation";
import { SetlistEditor } from "@/components/features/setlist/SetlistEditor";
import { getRepertoire } from "@/lib/queries/repertoire";
import { getSetlistDetail } from "@/lib/queries/setlists";

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

  const repertoire = await getRepertoire();

  return <SetlistEditor setlist={setlist} repertoire={repertoire} />;
}
