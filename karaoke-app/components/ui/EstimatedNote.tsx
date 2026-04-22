import { Info } from "lucide-react";

type Props = {
  /** Variant tailors the copy; defaults to the advice-engine footer. */
  variant?: "advice" | "generic";
  className?: string;
};

/**
 * Small standardized "this number is an estimate" footnote. Used in advice
 * sections and stats surfaces where DAM's internal formulas are non-public
 * and we're inferring from observed data.
 *
 * Single source of truth: changing the copy here updates every location.
 */
export function EstimatedNote({ variant = "advice", className = "" }: Props) {
  const copy =
    variant === "advice"
      ? "DAM 精密採点 Ai の公式ロジック詳細は非公開。表示は有志スコアラー実測と第一興商公開特許に基づく推定を含みます。"
      : "数値は推定です。DAM の内部計算式は非公開のため、観測データから推測した値を表示しています。";

  return (
    <p
      className={`flex items-start gap-1 border-t border-white/5 pt-2 text-[10px] text-white/30 ${className}`}
    >
      <Info size={10} className="mt-0.5 shrink-0" aria-hidden />
      <span>{copy}</span>
    </p>
  );
}
