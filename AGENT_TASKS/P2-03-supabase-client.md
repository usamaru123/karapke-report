---
id: P2-03
title: Supabase クライアント実装
phase: 2
type: code
depends_on: [P2-01]
blocks: [P2-04, P3-01]
agent: generator
estimated_minutes: 10
---

# P2-03: Supabase クライアント実装

## Goal
Server Component / Client Component / Middleware それぞれで使える Supabase クライアントのファクトリを作成する。

## Inputs
- `docs/nextjs-project-structure.md` の `lib/supabase/` 節
- @supabase/ssr 公式パターン

## Steps
1. `karaoke-app/lib/supabase/server.ts`:
   ```ts
   import { createServerClient } from '@supabase/ssr'
   import { cookies } from 'next/headers'

   export async function createClient() {
     const cookieStore = await cookies()
     return createServerClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
       {
         cookies: {
           getAll() {
             return cookieStore.getAll()
           },
           setAll(cookiesToSet) {
             try {
               cookiesToSet.forEach(({ name, value, options }) =>
                 cookieStore.set(name, value, options)
               )
             } catch {
               // Server Component context: ignore
             }
           },
         },
       }
     )
   }
   ```

2. `karaoke-app/lib/supabase/client.ts`:
   ```ts
   import { createBrowserClient } from '@supabase/ssr'

   export function createClient() {
     return createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
     )
   }
   ```

3. `karaoke-app/lib/supabase/middleware.ts` (middleware helper):
   ```ts
   import { createServerClient } from '@supabase/ssr'
   import { NextResponse, type NextRequest } from 'next/server'

   export async function updateSession(request: NextRequest) {
     let supabaseResponse = NextResponse.next({ request })

     const supabase = createServerClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
       {
         cookies: {
           getAll() {
             return request.cookies.getAll()
           },
           setAll(cookiesToSet) {
             cookiesToSet.forEach(({ name, value }) =>
               request.cookies.set(name, value)
             )
             supabaseResponse = NextResponse.next({ request })
             cookiesToSet.forEach(({ name, value, options }) =>
               supabaseResponse.cookies.set(name, value, options)
             )
           },
         },
       }
     )

     const { data: { user } } = await supabase.auth.getUser()

     return { supabase, response: supabaseResponse, user }
   }
   ```

4. `.env.local` を作成 (gitignore 済み):
   ```
   NEXT_PUBLIC_SUPABASE_URL=<P1-01 で取得>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<P1-01 で取得>
   ```

## Outputs
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `lib/supabase/middleware.ts`
- `.env.local` (gitignored)

## Evaluation
```yaml
MUST:
  - [FILE] lib/supabase/server.ts, client.ts, middleware.ts すべて存在
  - [CMD] pnpm type-check 終了コード 0
  - [FILE] .env.local に 2 変数が設定されている
```

## Failure Modes
- **@supabase/ssr の API が変わった**: 公式ドキュメント確認 https://supabase.com/docs/guides/auth/server-side/nextjs
- **cookies() が sync で動かない**: Next.js 15 では async が必須
