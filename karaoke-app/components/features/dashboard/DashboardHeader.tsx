import { formatDistanceToNowStrict, format } from "date-fns";
import { ja } from "date-fns/locale";

type Props = {
  displayName: string;
  lastSungAt: string | null;
};

export function DashboardHeader({ displayName, lastSungAt }: Props) {
  const lastLine = lastSungAt
    ? (() => {
        const d = new Date(lastSungAt);
        return `前回の歌唱: ${format(d, "M月d日", { locale: ja })} (${formatDistanceToNowStrict(d, { addSuffix: true, locale: ja })})`;
      })()
    : "前回の歌唱: まだありません";

  return (
    <section>
      <p className="text-lg font-semibold text-white">
        お帰りなさい、
        <span className="text-neon-cyan">{displayName}</span>
        さん
      </p>
      <p className="mt-1 text-xs text-white/50">{lastLine}</p>
    </section>
  );
}
