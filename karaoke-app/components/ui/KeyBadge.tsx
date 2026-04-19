import { formatKey } from "@/lib/format";

type Props = {
  value: number;
};

export function KeyBadge({ value }: Props) {
  const isNeutral = value === 0;
  const tone = isNeutral
    ? "text-white/50 border-white/15"
    : "text-neon-cyan border-neon-cyan/40";

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs tabular-nums ${tone}`}
    >
      KEY {formatKey(value)}
    </span>
  );
}
