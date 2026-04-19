---
id: P2-01
title: Next.js プロジェクト初期化
phase: 2
type: code
depends_on: []
blocks: [P2-02, P2-03, P2-04]
agent: generator
estimated_minutes: 10
---

# P2-01: Next.js プロジェクト初期化

## Goal
Next.js 15 + TypeScript + Tailwind プロジェクトを `karaoke-app/` ディレクトリに作成する。

## Steps
1. プロジェクト作成 (既存の `karaoke-app/` がないことを確認してから):
   ```bash
   pnpm create next-app@latest karaoke-app \
     --typescript \
     --tailwind \
     --app \
     --no-src-dir \
     --import-alias "@/*" \
     --eslint \
     --no-turbopack
   ```
2. 依存追加:
   ```bash
   cd karaoke-app
   pnpm add @supabase/supabase-js @supabase/ssr
   pnpm add recharts @dnd-kit/core @dnd-kit/sortable
   pnpm add date-fns sonner
   pnpm add react-hook-form zod @hookform/resolvers
   pnpm add lucide-react
   pnpm add -D @types/node
   ```
3. `.env.local.example` を作成:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```
4. `package.json` の scripts を追加:
   ```json
   {
     "scripts": {
       "dev": "next dev",
       "build": "next build",
       "start": "next start",
       "lint": "next lint",
       "type-check": "tsc --noEmit",
       "db:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID --schema public > types/database.ts"
     }
   }
   ```
5. `tsconfig.json` が `"strict": true` になっていることを確認

## Outputs
- `karaoke-app/` ディレクトリ
- `pnpm install` 完了
- `pnpm build` が成功 (初期の Hello World ページで)

## Evaluation
```yaml
MUST:
  - [FILE] karaoke-app/package.json 存在
  - [FILE] dependencies に next, @supabase/ssr, recharts, @dnd-kit/core 等を含む
  - [CMD] cd karaoke-app && pnpm install 終了コード 0
  - [CMD] pnpm build 終了コード 0
  - [CMD] pnpm type-check 終了コード 0
```

## Failure Modes
- **pnpm コマンドがない**: `npm install -g pnpm` でインストール
- **Node バージョンが古い**: Node 18.17+ が必要
- **create-next-app のプロンプト**: CI 環境では非対話モードにするため、上記 flag を全て指定
