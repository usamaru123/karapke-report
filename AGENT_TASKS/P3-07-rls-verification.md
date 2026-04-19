---
id: P3-07
title: RLS 検証
phase: 3
type: verify
depends_on: [P3-02, P3-03, P3-04, P3-05, P3-06]
blocks: []
agent: evaluator
estimated_minutes: 15
---

# P3-07: RLS 検証

## Goal
Row Level Security が全テーブルで正しく機能していることを確認する。ユーザー A のデータがユーザー B から見えないこと。

## Steps

### 1. テストユーザー追加
Supabase Dashboard で User B を追加 (User A とは別の email)

### 2. User A としてデータ作成
```bash
# User A でログインし、レパートリー 1 件作成
# 例: repertoire_A_1 が作成される
```

### 3. User B としてアクセス
```bash
# User B でログイン、以下を確認
```

### 4. 確認項目
```ts
// User B の Server Component から
const supabase = await createClient()
const { data: repertoire } = await supabase.from('repertoire').select('*')
// repertoire には User A のレパートリーが含まれないこと

const { data: scores } = await supabase.from('scores').select('*')
// scores も空であること (User B は何も歌っていないので)

const { data: sessions } = await supabase.from('sessions').select('*')
// sessions も空であること
```

### 5. 直接の違反試行
```ts
// User B から User A のデータを直接 SELECT を試す
const { data, error } = await supabase
  .from('repertoire')
  .select('*')
  .eq('user_id', USER_A_UUID)
// 結果: data は空配列、error はなし (RLS が静かに filter する仕様)
```

### 6. 書き込み違反試行
```ts
// User B が User A の user_id で INSERT を試す
const { error } = await supabase
  .from('repertoire')
  .insert({ user_id: USER_A_UUID, song_id: SOME_SONG_ID })
// 結果: error あり (RLS WITH CHECK で拒否される)
```

## Outputs
- RLS 検証レポート (pass/fail 一覧)

## Evaluation
```yaml
MUST:
  - [CMD] User B から User A のデータが SELECT できない
  - [CMD] User B から User A の user_id で INSERT すると拒否される
  - [DB] profiles 以外の user_id を持つテーブル 7 つ全てで RLS ON:
         SELECT COUNT(*) FROM pg_tables
         WHERE tablename IN ('sessions','scores','score_pitch_intervals','repertoire',
                             'setlists','setlist_items','sync_logs')
         AND rowsecurity = TRUE
         -- 期待: 7
  - [CMD] pnpm test lib/queries でテストが通る (RLS が効いた状態で)
```

## Failure Modes
- **RLS OFF のテーブルがある**: schema.sql 再適用で解決
- **policy の条件ミス**: policy USING (user_id = auth.uid()) を確認
- **service_role で操作してしまっている**: テスト時は必ず anon + JWT で接続
