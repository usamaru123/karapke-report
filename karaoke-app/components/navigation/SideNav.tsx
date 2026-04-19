"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, navItems } from "./nav-items";

export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-56 border-r border-white/10 bg-bg-surface md:block">
      <div className="px-4 py-5">
        <span className="text-lg font-semibold text-neon-pink neon-text-pink">
          カラオケレパ
        </span>
      </div>
      <nav>
        <ul className="flex flex-col gap-1 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                    active
                      ? "bg-bg-elevated text-white"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-y-1 left-0 w-1 rounded-r bg-neon-pink shadow-glow-pink"
                    />
                  )}
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
