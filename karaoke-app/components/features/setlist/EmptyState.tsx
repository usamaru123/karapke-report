import { ListMusic } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export function SetlistEmptyState() {
  return (
    <EmptyState
      icon={ListMusic}
      title="まだセットリストがありません"
      description="次回のカラオケで歌う曲をまとめておくと便利です。"
      primary={{ label: "+ 新しいセトリを作る", href: "/setlists/new" }}
    />
  );
}
