import { Clock, Home, List, ListMusic, Settings, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/repertoire", label: "レパ", icon: List },
  { href: "/history", label: "履歴", icon: Clock },
  { href: "/setlists", label: "セトリ", icon: ListMusic },
  { href: "/settings", label: "設定", icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
