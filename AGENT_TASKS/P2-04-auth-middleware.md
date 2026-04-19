---
id: P2-04
title: 認証 Middleware
phase: 2
type: code
depends_on: [P2-03]
blocks: [P2-05, P2-06]
agent: generator
estimated_minutes: 10
---

# P2-04: 認証 Middleware

## Goal
ログイン済みユーザーのみが認証必須ルートにアクセスできる middleware を実装する。

## Steps
1. `karaoke-app/middleware.ts`:
   ```ts
   import { type NextRequest, NextResponse } from 'next/server'
   import { updateSession } from '@/lib/supabase/middleware'

   export async function middleware(request: NextRequest) {
     const { response, user } = await updateSession(request)

     const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
     const isApiRoute  = request.nextUrl.pathname.startsWith('/api')

     // 未ログイン → /login へリダイレクト (login ページ自体と API は除外)
     if (!user && !isAuthRoute && !isApiRoute) {
       const url = request.nextUrl.clone()
       url.pathname = '/login'
       return NextResponse.redirect(url)
     }

     // ログイン済みで /login にアクセス → トップへリダイレクト
     if (user && isAuthRoute) {
       const url = request.nextUrl.clone()
       url.pathname = '/'
       return NextResponse.redirect(url)
     }

     return response
   }

   export const config = {
     matcher: [
       // 静的アセットは除外
       '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
     ],
   }
   ```

## Outputs
- `karaoke-app/middleware.ts`

## Evaluation
```yaml
MUST:
  - [FILE] middleware.ts 存在
  - [HTTP] 未ログインで / にアクセス → 302 to /login
  - [HTTP] /login 自体は 200 で返る
  - [CMD] pnpm build 終了コード 0
```

## Failure Modes
- **無限リダイレクトループ**: matcher が login ページを含んでしまっている。`isAuthRoute` 判定を確認
- **API ルートが 401 になる**: API 除外が matcher に含まれていない
