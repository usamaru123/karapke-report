import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type CtaLink = {
  label: string;
  href: string;
  tone?: "pink" | "cyan" | "muted";
};
type CtaButton = {
  label: string;
  onClick: () => void;
  tone?: "pink" | "cyan" | "muted";
};

type Props = {
  /** Icon drawn at the top. Keep it 32-40 px. */
  icon: LucideIcon;
  /** Headline. 1 line, >= 14 px. */
  title: string;
  /** Optional sub-copy below the title. 1-3 short sentences. */
  description?: ReactNode;
  /** Primary CTA. Rendered as pink button. Required unless `variant="plain"`. */
  primary?: CtaLink | CtaButton;
  /** Optional secondary action, rendered as muted link. */
  secondary?: CtaLink | CtaButton;
  /**
   * Visual container:
   *   "card"  — bordered panel (use inside sections that already have a bg).
   *   "plain" — no chrome, for top-level empty pages.
   */
  variant?: "card" | "plain";
  className?: string;
};

/**
 * Unified empty-state block used across the app so "no data yet" screens
 * share one voice and visual rhythm. Every empty state should push the user
 * toward a concrete next action rather than just stating the absence of data.
 *
 * Originally scattered across Dashboard / Repertoire / History / Setlist with
 * five slightly different typographic treatments; consolidate here.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  primary,
  secondary,
  variant = "card",
  className = "",
}: Props) {
  const wrapperCls =
    variant === "card"
      ? "flex flex-col items-center gap-4 rounded-xl border border-white/10 bg-bg-surface px-6 py-12 text-center"
      : "flex flex-col items-center gap-4 px-4 py-16 text-center";

  return (
    <div className={`${wrapperCls} ${className}`}>
      <Icon className="text-white/30" size={40} aria-hidden />
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-white/85">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-xs text-white/55">
            {description}
          </p>
        )}
      </div>
      {(primary || secondary) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {primary && <CtaNode cta={primary} primary />}
          {secondary && <CtaNode cta={secondary} />}
        </div>
      )}
    </div>
  );
}

function CtaNode({
  cta,
  primary = false,
}: {
  cta: CtaLink | CtaButton;
  primary?: boolean;
}) {
  const tone = cta.tone ?? (primary ? "pink" : "muted");
  const cls = primary
    ? tone === "pink"
      ? "rounded-md bg-neon-pink px-4 py-2 text-sm font-semibold text-black shadow-glow-pink"
      : tone === "cyan"
        ? "rounded-md bg-neon-cyan px-4 py-2 text-sm font-semibold text-black shadow-glow-cyan"
        : "rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white"
    : "text-xs text-neon-cyan hover:underline underline-offset-2";

  if ("href" in cta) {
    return (
      <Link href={cta.href} className={cls}>
        {cta.label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={cta.onClick} className={cls}>
      {cta.label}
    </button>
  );
}
