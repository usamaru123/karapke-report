# Next.js プロジェクト構造の想定

Phase 2 以降の Next.js アプリのディレクトリ構造と、主要ファイルの責務を定義。Claude Code はこれを目安に実装してよいし、もっと良い構成があれば提案してくれてよい。

## 全体構成

```
karaoke-app/
├── app/                              # App Router
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (app)/                        # 認証必須のルートグループ
│   │   ├── layout.tsx                # ナビ付きレイアウト
│   │   ├── page.tsx                  # ダッシュボード
│   │   ├── repertoire/
│   │   │   ├── page.tsx              # 一覧
│   │   │   └── [id]/
│   │   │       └── page.tsx          # 詳細
│   │   ├── history/
│   │   │   └── page.tsx
│   │   ├── setlists/
│   │   │   ├── page.tsx              # 一覧
│   │   │   └── [id]/
│   │   │       └── page.tsx          # 編集
│   │   └── settings/
│   │       └── page.tsx
│   ├── api/
│   │   └── sync/
│   │       └── route.ts              # 手動同期エンドポイント
│   ├── globals.css
│   └── layout.tsx                    # ルートレイアウト
│
├── components/
│   ├── ui/                           # 汎用コンポーネント
│   │   ├── Card.tsx
│   │   ├── ScoreBadge.tsx            # 点数表示（色分け）
│   │   ├── KeyBadge.tsx              # KEY ±0/-1/+2
│   │   ├── ConfidenceStars.tsx       # ★★☆
│   │   ├── TagChip.tsx
│   │   ├── FilterChip.tsx
│   │   └── FAB.tsx
│   ├── charts/
│   │   ├── RadarChart.tsx            # 5項目レーダー
│   │   ├── VocalRangeBar.tsx         # 鍵盤風音域バー
│   │   └── ScoreHistoryChart.tsx     # 歌唱推移折れ線
│   ├── navigation/
│   │   ├── BottomNav.tsx             # モバイル
│   │   └── SideNav.tsx               # PC
│   └── features/
│       ├── repertoire/
│       │   ├── RepertoireCard.tsx
│       │   ├── RepertoireList.tsx
│       │   ├── AddSongModal.tsx
│       │   └── FilterBar.tsx
│       ├── dashboard/
│       │   ├── HeroCard.tsx
│       │   ├── KpiTile.tsx
│       │   └── RecentScoreList.tsx
│       ├── history/
│       │   ├── SessionHeader.tsx
│       │   └── ScoreRow.tsx
│       └── setlist/
│           ├── SetlistCard.tsx
│           └── SetlistItemDraggable.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts                 # createServerClient for Server Components
│   │   ├── client.ts                 # createBrowserClient for Client Components
│   │   └── middleware.ts             # auth middleware helper
│   ├── queries/                      # データ取得関数（Server Component から呼ぶ）
│   │   ├── repertoire.ts             # getRepertoire, getRepertoireDetail
│   │   ├── dashboard.ts              # getDashboardSummary, getRecentScores
│   │   ├── history.ts                # getHistoryWithSessions
│   │   └── setlists.ts               # getSetlistsWithItems, getSetlistDetail
│   ├── actions/                      # Server Actions（書き込み系）
│   │   ├── repertoire.ts             # addToRepertoire, updateMeta, removeFromRepertoire
│   │   ├── setlists.ts               # createSetlist, reorderItems, addItem
│   │   └── sync.ts                   # triggerSync (calls Edge Function)
│   ├── midi.ts                       # MIDI note <-> note name 変換ユーティリティ
│   ├── date.ts                       # 相対日付（「2日前」「今月」）
│   └── utils.ts                      # cn(), formatScore() など小物
│
├── types/
│   ├── database.ts                   # Supabase 自動生成型
│   └── domain.ts                     # ビジネスドメイン型（Repertoire, Setlist 等）
│
├── middleware.ts                     # ルート保護
├── next.config.ts
├── tailwind.config.ts                # デザイントークン
├── tsconfig.json
├── package.json
└── .env.local
```

## 主要ファイルの責務

### `app/(app)/layout.tsx`

認証チェック + 共通レイアウト:

```tsx
// 擬似コード
export default async function AppLayout({ children }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-bg-base">
      <aside className="hidden md:block fixed left-0 top-0 h-full w-56">
        <SideNav />
      </aside>
      <main className="md:ml-56 pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav className="md:hidden fixed bottom-0 w-full" />
    </div>
  )
}
```

### `lib/supabase/server.ts`

Server Component から Supabase を呼ぶためのファクトリ:

```tsx
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* ... */ } }
  )
}
```

### `lib/queries/repertoire.ts`

データ取得の集約場所。RLS が効くので `user_id` 条件は不要（anon key で接続すれば auth.uid() が自動適用）:

```tsx
export async function getRepertoire(filters?: RepertoireFilters) {
  const supabase = await createClient()
  const query = supabase
    .from('repertoire')
    .select(`
      *,
      song:songs(*),
      best_score:scores(total_score, sung_at).order(total_score.desc).limit(1)
    `)
  // filters の適用...
  const { data, error } = await query
  if (error) throw error
  return data
}
```

### `lib/actions/sync.ts`

Server Action から Edge Function を呼ぶ:

```tsx
'use server'

export async function triggerSync() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase.functions.invoke('sync-scores', {
    body: { userId: user.id },
  })
  if (error) throw error
  revalidatePath('/')
  return data
}
```

## tailwind.config.ts のトークン

`docs/karaoke-app-design-spec.md` の section 1 からカラーを抜粋:

```ts
export default {
  theme: {
    extend: {
      colors: {
        'bg-base': '#0a0a14',
        'bg-surface': '#13132a',
        'bg-elevated': '#1c1c3a',
        'neon-pink': '#ff2a8a',
        'neon-cyan': '#00e5ff',
        'neon-purple': '#a855f7',
        'neon-green': '#00ff9d',
        'neon-amber': '#ffb300',
      },
      boxShadow: {
        'glow-pink': '0 0 16px rgba(255, 42, 138, 0.4)',
        'glow-cyan': '0 0 16px rgba(0, 229, 255, 0.4)',
      },
    },
  },
}
```

## 型生成のフロー

Supabase から型を自動生成するのが楽:

```bash
npm install -D supabase

# package.json scripts に追加
# "db:types": "supabase gen types typescript --project-id <PROJECT_REF> --schema public > types/database.ts"

npm run db:types
```

生成された型を使うときは:

```ts
import type { Database } from '@/types/database'
type Score = Database['public']['Tables']['scores']['Row']
```

## Middleware（ルート保護）

```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const supabase = createServerClient(/* ... */)
  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

## 推奨ライブラリ

| 用途 | ライブラリ | 理由 |
|---|---|---|
| Supabase 接続 | `@supabase/ssr`, `@supabase/supabase-js` | 公式 |
| チャート | `recharts` | React ネイティブ、レーダー + 折れ線両対応 |
| DnD | `@dnd-kit/core` | React 純正、スマホ対応良好 |
| 日付 | `date-fns` | 軽量、相対日付（「2日前」）も簡単 |
| 状態管理 | （Server Components 中心なら不要） | URL State で足りるはず |
| フォーム | `react-hook-form` + `zod` | 型安全、軽量 |
| トースト | `sonner` | ダークモードに馴染む |

## やらなくていいこと（アンチパターン）

- ❌ Redux / Zustand 等のグローバル状態管理（Server Components で足りる）
- ❌ カスタム認証（Supabase Auth で十分）
- ❌ ORM（supabase-js があれば不要）
- ❌ ビューモデル層（Server Component がそのままビューモデル役）
- ❌ GraphQL（supabase-js の `.select()` で足りる）
