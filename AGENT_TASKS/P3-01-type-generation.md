---
id: P3-01
title: Supabase 型生成
phase: 3
type: code
depends_on: [P1-02, P2-03]
blocks: [P3-02, P3-03, P3-04, P3-05, P3-06]
agent: generator
estimated_minutes: 10
---

# P3-01: Supabase 型生成

## Goal
Supabase CLI で DB スキーマから TypeScript 型を自動生成し、`types/database.ts` に配置する。

## Steps
1. Supabase CLI インストール (未済なら):
   ```bash
   npm install -g supabase
   ```
2. プロジェクトを link:
   ```bash
   cd karaoke-app
   supabase link --project-ref <プロジェクトID>
   ```
3. 型生成:
   ```bash
   supabase gen types typescript --linked --schema public > types/database.ts
   ```
4. `package.json` の `db:types` スクリプトを確認・更新
5. `types/domain.ts` で汎用型エイリアス:
   ```ts
   import type { Database } from './database'
   export type Song = Database['public']['Tables']['songs']['Row']
   export type Score = Database['public']['Tables']['scores']['Row']
   export type Session = Database['public']['Tables']['sessions']['Row']
   export type Repertoire = Database['public']['Tables']['repertoire']['Row']
   export type Setlist = Database['public']['Tables']['setlists']['Row']
   export type SetlistItem = Database['public']['Tables']['setlist_items']['Row']
   export type ConfidenceLevel = Database['public']['Enums']['confidence_level']
   ```

## Outputs
- `types/database.ts` (自動生成)
- `types/domain.ts` (手書きエイリアス)

## Evaluation
```yaml
MUST:
  - [FILE] types/database.ts が存在、9 テーブル分の Row/Insert/Update 型が含まれる
  - [FILE] types/domain.ts で Song, Score, Session 等がエクスポート
  - [CMD] pnpm type-check 終了コード 0
```

## Failure Modes
- **supabase CLI がログインできない**: `supabase login` を先に実行
- **型ファイルが空**: schema がまだ適用されていない (P1-02 未完了)
