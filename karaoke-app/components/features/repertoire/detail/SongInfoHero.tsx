import type { Song } from "@/types/domain";

type Props = { song: Song };

export function SongInfoHero({ song }: Props) {
  return (
    <section className="px-4 py-3">
      <h2 className="text-2xl font-bold text-white">{song.title}</h2>
      <p className="mt-1 text-sm text-white/60">{song.artist}</p>
      {song.request_no && (
        <p className="mt-2 text-xs text-white/40 tabular-nums">
          requestNo: {song.request_no}
        </p>
      )}
    </section>
  );
}
