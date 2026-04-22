# 自動評価基準 (EVALUATION.md)

各 Phase / Task の完了を **機械判定可能** な形で定義する。Evaluator Agent はこのドキュメントをもとに pass/fail を返す。

## 凡例

- `[CMD]` シェルコマンド、終了コード 0 で pass
- `[HTTP]` HTTP リクエスト、指定ステータスで pass
- `[DB]` SQL 実行、指定結果で pass
- `[FILE]` ファイル存在・内容チェック
- `[VISUAL]` Playwright スクリーンショットとの pixel diff
- `[HUMAN]` 人間の承認が必要（自動判定不可）

各 Task に対して **必須条件 (MUST)** と **推奨条件 (SHOULD)** を分ける。MUST が 1 つでも fail なら Task 未完了、SHOULD は fail でも継続可能だが Warning 扱い。

---

## Phase 1: データ基盤

### P1-01 Supabase プロジェクト作成

```yaml
MUST:
  - [HUMAN] Supabase Dashboard でプロジェクトが作成済み、URL/anon_key/service_role_key を取得済み
  - [FILE] poc/karaoke-sync-poc/.env に SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / TARGET_USER_ID が設定されている
SHOULD:
  - [HUMAN] supabase_vault 拡張が有効化されている (Dashboard > Database > Extensions)
```

### P1-02 Schema 適用

```yaml
MUST:
  - [DB] SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' >= 9
         # profiles, songs, sessions, scores, score_pitch_intervals, repertoire, setlists, setlist_items, sync_logs
  - [DB] SELECT COUNT(*) FROM pg_type WHERE typname IN ('confidence_level', 'range_source', 'scoring_type') = 3
  - [DB] SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' >= 10   # RLS policies
  - [DB] SELECT COUNT(*) FROM pg_trigger WHERE tgname IN (
           'scores_session_stats', 'scores_update_song_range',
           'profiles_updated_at', 'songs_updated_at', 'sessions_updated_at',
           'repertoire_updated_at', 'setlists_updated_at'
         ) = 7
  - [DB] SELECT COUNT(*) FROM pg_proc WHERE proname IN (
           'set_my_cdm_card_no', 'get_cdm_card_no_for'
         ) = 2
SHOULD:
  - [DB] SELECT pg_indexes_size('scores') IS NOT NULL   # インデックス作成済み
```

### P1-03 PoC Dry-Run 成功

```yaml
MUST:
  - [CMD] cd poc/karaoke-sync-poc && python scripts/sync_scores.py sync --dry-run
          の出力に以下が含まれること:
          - "dry_run_mode"
          - "scores_fetched" が 1 以上
  - [CMD] 終了コード 0
SHOULD:
  - [CMD] 出力に "parse_failed" が含まれない (含まれる場合は parser.py の修正が必要)
```

### P1-04 PoC 本番同期

```yaml
MUST:
  - [CMD] cd poc/karaoke-sync-poc && python scripts/sync_scores.py sync の終了コード 0
  - [DB] SELECT COUNT(*) FROM scores >= 1
  - [DB] SELECT COUNT(*) FROM songs >= 1
  - [DB] SELECT COUNT(*) FROM sessions >= 1
  - [DB] SELECT COUNT(*) FROM sync_logs WHERE status IN ('success', 'partial') >= 1
SHOULD:
  - [DB] SELECT COUNT(*) FROM scores WHERE vocal_range_highest IS NOT NULL > 0
         # 音域データが取れている
  - [DB] SELECT COUNT(*) FROM songs WHERE vocal_range_highest IS NOT NULL > 0
         # トリガーで songs に音域が伝播している
  - [DB] SELECT AVG(score_count) FROM sessions > 1
         # セッション集計トリガーが動いている
```

### P1-05 冪等性検証

```yaml
MUST:
  - [CMD] python scripts/sync_scores.py sync を 2 回連続実行
  - [DB] 2 回目実行後の scores のレコード数が 1 回目と同じ
  - [CMD] 2 回目の出力で "scores_new: 0" または少数、"scores_skipped" が 1 回目の scores 数と同等
```

### Phase 1 完了条件

全 P1-* タスクの MUST が pass。SHOULD は WARN として記録するが継続可能。

---

## Phase 2: Next.js プロジェクト初期化

### P2-01 プロジェクト起動

```yaml
MUST:
  - [FILE] karaoke-app/package.json が存在
  - [FILE] karaoke-app/package.json の dependencies に next, react, @supabase/ssr が含まれる
  - [FILE] karaoke-app/tsconfig.json が存在、strict: true
  - [CMD] cd karaoke-app && pnpm install の終了コード 0
  - [CMD] cd karaoke-app && pnpm build の終了コード 0
SHOULD:
  - [FILE] .env.local.example が存在
  - [FILE] tailwind.config.ts に neon-pink, neon-cyan 等のトークンが定義されている
```

### P2-02 認証 Middleware

```yaml
MUST:
  - [FILE] karaoke-app/middleware.ts が存在
  - [FILE] karaoke-app/lib/supabase/server.ts が存在、createServerClient を export
  - [FILE] karaoke-app/lib/supabase/client.ts が存在、createBrowserClient を export
  - [FILE] karaoke-app/app/(auth)/login/page.tsx が存在
  - [HTTP] http://localhost:3000/ にアクセスしたとき、未ログインなら /login にリダイレクト (302)
  - [HTTP] http://localhost:3000/login は 200 で返る
```

### P2-03 ナビゲーション骨格

```yaml
MUST:
  - [FILE] karaoke-app/components/navigation/BottomNav.tsx が存在
  - [FILE] karaoke-app/components/navigation/SideNav.tsx が存在
  - [HTTP] ログイン後、以下 URL がすべて 200 で返る:
          /, /repertoire, /history, /setlists, /settings
  - [VISUAL] モバイル幅 (375px) でボトムナビが表示、PC幅 (1440px) でサイドナビが表示
SHOULD:
  - [CMD] pnpm lint の終了コード 0
```

### Phase 2 完了条件

全 P2-* タスクの MUST が pass。

---

## Phase 3: データ取得層

### P3-01 型生成

```yaml
MUST:
  - [FILE] karaoke-app/types/database.ts が存在、supabase-gen で生成された型定義を含む
  - [FILE] karaoke-app/package.json の scripts に "db:types" コマンドが追加されている
  - [CMD] cd karaoke-app && pnpm tsc --noEmit の終了コード 0
```

### P3-02 Query 関数

```yaml
MUST:
  - [FILE] karaoke-app/lib/queries/repertoire.ts, dashboard.ts, history.ts, setlists.ts すべて存在
  - [FILE] 各ファイルが getXxx 形式の関数を export している
  - [CMD] pnpm tsc --noEmit の終了コード 0
  - [CMD] pnpm test lib/queries の終了コード 0 (ユニットテストが書かれていれば)
SHOULD:
  - [FILE] getRepertoire 関数に RepertoireFilters 型の引数がある
```

### P3-03 Server Action

```yaml
MUST:
  - [FILE] karaoke-app/lib/actions/repertoire.ts, setlists.ts, sync.ts が存在
  - [FILE] 各ファイルの冒頭に 'use server' ディレクティブ
  - [CMD] pnpm tsc --noEmit の終了コード 0
```

### P3-04 RLS 検証

```yaml
MUST:
  - [CMD] テストスクリプトを実行:
    - User A でログイン → getRepertoire → 自分のデータのみ返る
    - User B でログイン → getRepertoire → 自分のデータのみ返る (User A のは見えない)
  - [DB] ALTER TABLE を使わずにクライアントから他人のデータが取得できないこと
```

### Phase 3 完了条件

全 P3-* タスクの MUST が pass。

---

## Phase 4: 画面実装

各画面ごとに評価基準を定義。共通条件は全画面に適用。

### 共通条件 (全画面)

```yaml
MUST:
  - [CMD] pnpm build の終了コード 0
  - [CMD] pnpm tsc --noEmit の終了コード 0
  - [CMD] pnpm lint の終了コード 0
  - [HTTP] 該当 URL が 200 で返る (ログイン後)
  - [HTTP] モックデータではなく実 DB からデータ取得している (Network タブで Supabase へのリクエストを確認)
SHOULD:
  - [VISUAL] Claude Design のスクショとの pixel diff < 15%
  - [CMD] Lighthouse: Performance > 70, Accessibility > 85
```

### P4-01 レパートリー一覧 (/repertoire)

```yaml
MUST:
  - [HTTP] /repertoire が 200
  - [VISUAL] ヘッダー、フィルタチップ、並び替え、曲カードリスト、FAB が表示
  - [CMD] 90+ 点の曲のスコアが neon-pink クラスで色付け
  - [CMD] 80-90 点の曲のスコアが白色
  - [CMD] FAB クリックでモーダルが開く
  - [HTTP] /repertoire?filter=over90 でフィルタされた結果が返る
SHOULD:
  - [VISUAL] モバイル/PC 両方でレイアウト崩れなし
  - [CMD] 1000 件のレパでも LCP < 2.5s
```

### P4-02 レパートリー詳細 (/repertoire/[id])

```yaml
MUST:
  - [HTTP] /repertoire/<実在のID> が 200
  - [VISUAL] 曲情報ヒーロー、スコアサマリ3カラム、レーダーチャート、音域バー、メタ情報、歌唱推移グラフ すべて表示
  - [CMD] レーダーチャートが recharts の RadarChart コンポーネント
  - [CMD] 音域が MIDI note 番号から正しい音名表示 (例: 50 → D3)
  - [HTTP] 存在しない ID → 404 を返す
SHOULD:
  - [CMD] 編集モード切替が動作 (meta 情報を更新できる)
```

### P4-03 ダッシュボード (/)

```yaml
MUST:
  - [HTTP] / が 200
  - [VISUAL] ヒーローカード、KPI 2x2、最近の歌唱、取り込みカード すべて表示
  - [CMD] KPI タイルが実データを反映 (レパ数、総歌唱回数、平均点、90+達成曲)
  - [CMD] 「取り込む」ボタンが Server Action を呼ぶ
SHOULD:
  - [CMD] 自己ベスト更新バッジが条件付きで表示される
```

### P4-04 採点履歴 (/history)

```yaml
MUST:
  - [HTTP] /history が 200
  - [VISUAL] 期間タブ、セッション見出し、曲行 が表示
  - [CMD] 同じ日の連続歌唱が 1 セッションにグルーピングされている
  - [CMD] セッション見出しに日付 + 曜日 + 曲数が表示
SHOULD:
  - [CMD] 期間タブで「今月/今年/全期間」の切替が動作
```

### P4-05 曲追加モーダル

```yaml
MUST:
  - [VISUAL] FAB クリックでボトムシートが開く
  - [CMD] タブ切替「採点履歴から」「手動で追加」が動作
  - [CMD] 採点履歴タブで、scores から重複排除した曲リストを表示
  - [CMD] 手動追加フォームで曲名+アーティストを入力 → repertoire に追加できる
  - [DB] INSERT INTO repertoire が成功、ユニーク制約違反ケースもハンドリング
```

### P4-06, P4-07 セトリ (/setlists, /setlists/[id])

```yaml
MUST:
  - [HTTP] 両 URL が 200
  - [CMD] セトリ作成・編集・削除が動作
  - [CMD] DnD で曲の順番を並べ替えできる
  - [DB] setlist_items の position が reorder 後も UNIQUE 制約を満たす
```

### Phase 4 完了条件

全画面の MUST が pass。SHOULD のうち VISUAL 系は人間レビュー可。

---

## Phase 5: 同期スケジュール化 + デプロイ

### P5-01 Edge Function 実装

```yaml
MUST:
  - [FILE] supabase/functions/sync-scores/index.ts が存在
  - [CMD] supabase functions deploy sync-scores の終了コード 0
  - [HTTP] supabase functions invoke sync-scores がステータス 200 を返す
  - [DB] Edge Function 実行後、scores テーブルに新しいレコードが追加される (本番データと差分がある場合)
  - [DB] Edge Function 実行後、sync_logs に新しいレコードが追加される
SHOULD:
  - [FILE] TypeScript 実装が poc/karaoke-sync-poc/src/ のロジックと機能等価
```

### P5-02 cdmCardNo 連携

> **設計変更メモ (2026-04)**: 当初は Supabase Vault 暗号化 (`profiles.cdm_card_no_vault_id UUID`) を
> 想定していたが、MVP は plaintext 列 (`profiles.cdm_card_no TEXT`) に退避した。
> セキュリティは **RLS + service_role 限定 RPC** で担保する。Phase 6 以降で Vault
> に戻す余地は残す (schema.sql 冒頭コメント参照)。以下 MUST は plaintext 前提に
> 書き換え済み。

```yaml
MUST:
  - [CMD] ユーザーが set_my_cdm_card_no('<test-card>') を RPC で呼び出せる
  - [DB] profiles.cdm_card_no が NULL でなく、長さ 20 文字以上
  - [CMD] service_role で profiles.cdm_card_no を SELECT すると登録した値が返る
  - [CMD] anon / authenticated ロールでは get_cdm_card_no_for を呼び出せない
         (GRANT が service_role 限定なので関数自体が実行不可)
```

### P5-03 Cron スケジュール

```yaml
MUST:
  - [FILE] vercel.json または .github/workflows/ に Cron 定義がある
  - [HUMAN] 24 時間後に Cron が 1 回動いたことを sync_logs で確認
SHOULD:
  - [CMD] Cron の実行失敗時にログが残る・通知される設定
```

### P5-04 Vercel デプロイ

```yaml
MUST:
  - [HUMAN] Vercel にデプロイ完了、本番 URL が発行されている
  - [HTTP] 本番 URL にアクセスしてログイン、全画面が動作する
  - [CMD] Vercel の環境変数に SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されている
  - [CMD] Vercel の環境変数に SERVICE_ROLE_KEY が設定されていない (Edge Function 側にのみ設定)
```

### Phase 5 完了条件

全 P5-* タスクの MUST が pass。HUMAN 判定が含まれるため完全自律は不可。

---

## 総合評価: MVP 完成判定

```yaml
MUST:
  - 全 Phase 1-5 の MUST が pass
  - [CMD] e2e テスト: ログイン → レパ一覧 → レパ詳細 → 履歴 → セトリ作成 → 同期 が通る
  - [HUMAN] ユーザーが実機で動作確認し OK を出す
SHOULD:
  - [CMD] Lighthouse 全画面で Performance > 70, Accessibility > 85
  - [CMD] テストカバレッジ: lib/queries/ と lib/actions/ で 70% 以上
  - [HUMAN] デザインの視覚的一致度がユーザー許容範囲
```

---

## Evaluator Agent へのメタ指示

### 失敗時の推奨アクション

| 失敗パターン | 推奨リカバリ |
|---|---|
| PoC `parse_failed` ログ | `show-xml <id>` で生 XML 確認 → parser.py の属性マッピング修正 → 再実行 |
| `pnpm build` エラー | エラーメッセージを Generator に返し、該当ファイルの再生成を依頼 |
| 型エラー | `pnpm db:types` で型再生成 → 失敗ならスキーマ差分確認 |
| RLS 違反 | クエリに user_id フィルタが抜けていないか確認 |
| VISUAL diff 過大 | Claude Design スクショ再確認、Tailwind クラス調整 |

### 無限ループ防止

- 同じ Task で **3 回連続失敗** した場合、自動リカバリを停止し Human に escalate
- 1 Phase で **累計 20 回以上** の再生成が走った場合、Task 分解を見直す
