import { extractTechniqueCounts } from "@/lib/advice/raw-xml-extract";

type Props = {
  rawXml: unknown | null;
};

const LABELS: [keyof ReturnType<typeof extractTechniqueCounts>, string][] = [
  ["kobushi", "こぶし"],
  ["shakuri", "しゃくり"],
  ["fall", "フォール"],
  ["vibrato", "ビブラート"],
  ["accent", "アクセント"],
  ["hammering", "ハンマリング"],
  ["edgeVoice", "エッジボイス"],
  ["hiccup", "ヒーカップ"],
];

/**
 * Grid of 8 technique counts for the per-score detail page. Silently shows
 * "—" for any count that's null (old raw_xml missing that field).
 */
export function TechniqueCountGrid({ rawXml }: Props) {
  if (rawXml === null || rawXml === undefined) {
    return (
      <p className="py-3 text-center text-xs text-white/40">
        技法データが記録されていません。
      </p>
    );
  }

  const counts = extractTechniqueCounts(rawXml);
  const allNull = Object.values(counts).every((v) => v === null);
  if (allNull) {
    return (
      <p className="py-3 text-center text-xs text-white/40">
        技法データが記録されていません。
      </p>
    );
  }

  return (
    <dl className="grid grid-cols-4 gap-2">
      {LABELS.map(([key, label]) => {
        const v = counts[key];
        const dim = v === null || v === 0;
        return (
          <div
            key={key}
            className="rounded-md border border-white/10 bg-bg-surface px-2 py-1.5 text-center"
          >
            <dt className={`text-[10px] ${dim ? "text-white/30" : "text-white/60"}`}>
              {label}
            </dt>
            <dd
              className={`mt-0.5 text-sm font-semibold tabular-nums ${
                dim ? "text-white/40" : "text-white"
              }`}
            >
              {v === null ? "—" : v}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
