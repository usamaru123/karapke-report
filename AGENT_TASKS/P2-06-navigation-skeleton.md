---
id: P2-06
title: ナビゲーション骨格
phase: 2
type: code
depends_on: [P2-04]
blocks: [P4-01, P4-02, P4-03, P4-04, P4-06, P4-07]
agent: generator
estimated_minutes: 20
---

# P2-06: ナビゲーション骨格

## Goal
モバイル: ボトムナビ、PC: サイドナビ を実装し、認証必須ルートの空ページを 5 つ用意する。

## Inputs
- `docs/karaoke-app-design-spec.md` の section 1 「共通コンポーネント」

## Steps
1. `karaoke-app/components/navigation/BottomNav.tsx`:
   ```tsx
   'use client'
   import Link from 'next/link'
   import { usePathname } from 'next/navigation'
   import { Home, List, Clock, ListMusic, Settings } from 'lucide-react'

   const items = [
     { href: '/',           label: 'ホーム',       icon: Home },
     { href: '/repertoire', label: 'レパ',         icon: List },
     { href: '/history',    label: '履歴',         icon: Clock },
     { href: '/setlists',   label: 'セトリ',       icon: ListMusic },
     { href: '/settings',   label: '設定',         icon: Settings },
   ]

   export function BottomNav() {
     const pathname = usePathname()
     return (
       <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-bg-surface border-t border-white/10">
         <ul className="flex justify-around py-2">
           {items.map(({ href, label, icon: Icon }) => {
             const active = pathname === href || pathname.startsWith(href + '/')
             return (
               <li key={href}>
                 <Link
                   href={href}
                   className={`flex flex-col items-center py-1 px-3 ${
                     active ? 'text-neon-cyan' : 'text-white/60'
                   }`}
                 >
                   <Icon size={20} />
                   <span className="text-xs mt-1">{label}</span>
                 </Link>
               </li>
             )
           })}
         </ul>
       </nav>
     )
   }
   ```

2. `karaoke-app/components/navigation/SideNav.tsx`:
   - 同じ items 定義を使用
   - PC 用サイドバー (w-56, fixed left-0)
   - アクティブ時は左端にネオンピンクの縦バー

3. `karaoke-app/app/(app)/layout.tsx`:
   ```tsx
   import { createClient } from '@/lib/supabase/server'
   import { redirect } from 'next/navigation'
   import { BottomNav } from '@/components/navigation/BottomNav'
   import { SideNav } from '@/components/navigation/SideNav'

   export default async function AppLayout({ children }: { children: React.ReactNode }) {
     const supabase = await createClient()
     const { data: { user } } = await supabase.auth.getUser()
     if (!user) redirect('/login')

     return (
       <div className="min-h-screen bg-bg-base">
         <SideNav className="hidden md:block" />
         <main className="md:ml-56 pb-20 md:pb-0">
           {children}
         </main>
         <BottomNav />
       </div>
     )
   }
   ```

4. 空ページを 5 つ作成 (`app/(app)/*/page.tsx`):
   - `page.tsx` - ダッシュボード
   - `repertoire/page.tsx`
   - `history/page.tsx`
   - `setlists/page.tsx`
   - `settings/page.tsx`
   - それぞれ `<h1>{title}</h1>` のみの空実装

## Outputs
- `components/navigation/BottomNav.tsx`
- `components/navigation/SideNav.tsx`
- `app/(app)/layout.tsx`
- `app/(app)/page.tsx` ほか 4 ルート

## Evaluation
```yaml
MUST:
  - [HTTP] ログイン後、/ , /repertoire, /history, /setlists, /settings すべて 200
  - [VISUAL] モバイル幅 (375px) でボトムナビ表示、PC幅 (1440px) でサイドナビ表示
  - [CMD] ナビをタップで画面遷移
  - [CMD] アクティブ画面のナビ項目がハイライト
```

## Failure Modes
- **SideNav が常時表示される**: `hidden md:block` の Tailwind クラスが正しく当たっているか確認
- **ボトムナビが main コンテンツに被る**: `<main>` に `pb-20` を忘れずに
