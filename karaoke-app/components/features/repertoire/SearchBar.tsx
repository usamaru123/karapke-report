"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  initialQuery: string;
};

export function SearchBar({ initialQuery }: Props) {
  const [expanded, setExpanded] = useState(initialQuery.length > 0);
  const [value, setValue] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  function submit(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim() === "") params.delete("q");
    else params.set("q", next.trim());
    router.push(`${pathname}?${params.toString()}`);
  }

  if (!expanded) {
    return (
      <button
        type="button"
        aria-label="検索を開く"
        onClick={() => setExpanded(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-white/70 hover:bg-white/5 hover:text-white"
      >
        <Search size={18} />
      </button>
    );
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
      className="flex flex-1 items-center gap-2 rounded-md border border-white/10 bg-bg-elevated px-2"
    >
      <Search size={16} className="text-white/50" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="曲名・アーティストで検索"
        className="flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-white/30"
      />
      <button
        type="button"
        aria-label="検索を閉じる"
        onClick={() => {
          setValue("");
          submit("");
          setExpanded(false);
        }}
        className="flex h-7 w-7 items-center justify-center rounded text-white/50 hover:bg-white/5 hover:text-white"
      >
        <X size={14} />
      </button>
    </form>
  );
}
