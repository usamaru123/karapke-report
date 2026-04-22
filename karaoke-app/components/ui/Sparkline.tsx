/**
 * Tiny inline sparkline. Pure SVG, no recharts dependency — we want this to
 * render cheaply inside many rows (repertoire cards, KPI tiles).
 *
 * - If fewer than 2 points, renders a muted dash placeholder ("—").
 * - Y domain defaults to the data range, but can be pinned with `yDomain`
 *   so multiple sparklines on screen share a comparable scale.
 * - Last point is highlighted with a small dot.
 */

type Props = {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  /** Hex or CSS color for the stroke. Defaults to neon-pink. */
  stroke?: string;
  /** Pin the Y axis range (useful when multiple sparklines compare visually). */
  yDomain?: [number, number];
  /** Show the most recent point as a dot. */
  showLastDot?: boolean;
  /** Accessible label announcing the trend. */
  ariaLabel?: string;
};

export function Sparkline({
  values,
  width = 64,
  height = 20,
  className = "",
  stroke = "#ff3d9a",
  yDomain,
  showLastDot = true,
  ariaLabel,
}: Props) {
  if (values.length < 2) {
    return (
      <span
        className={`inline-block text-[10px] text-white/30 tabular-nums ${className}`}
        style={{ width, height, lineHeight: `${height}px` }}
        aria-label="データ不足"
      >
        —
      </span>
    );
  }

  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const [domMin, domMax] =
    yDomain ?? [Math.min(...values), Math.max(...values)];
  const span = Math.max(domMax - domMin, 0.0001);

  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * innerW;
    const y = pad + innerH - ((v - domMin) / span) * innerH;
    return [x, y] as const;
  });

  const d = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const lastPt = pts[pts.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={ariaLabel ?? `推移 ${values.length} 点`}
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showLastDot && (
        <circle cx={lastPt[0]} cy={lastPt[1]} r={1.8} fill={stroke} />
      )}
    </svg>
  );
}
