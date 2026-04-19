"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PeriodFilter } from "@/lib/queries/history";

const TABS: { key: PeriodFilter; label: string }[] = [
  { key: "this_month", label: "今月" },
  { key: "this_year", label: "今年" },
  { key: "all", label: "全期間" },
];

type Props = { active: PeriodFilter };

export function PeriodTabs({ active }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(key: PeriodFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "this_month") params.delete("period");
    else params.set("period", key);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      className="flex gap-6 border-b border-white/10 px-4"
      role="tablist"
      aria-label="期間"
    >
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => select(t.key)}
            className={`relative py-2.5 text-sm transition-colors ${
              on
                ? "text-neon-cyan"
                : "text-white/60 hover:text-white"
            }`}
          >
            {t.label}
            {on && (
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-neon-cyan shadow-glow-cyan"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
