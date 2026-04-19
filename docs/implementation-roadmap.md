# 実装ロードマップ

MVP 完成までを Phase 1-5 に分割。各 Phase の完了基準と、その後の拡張 Phase を定義。

---

## Phase 1: データ基盤（所要 2-3 時間）

### 目的
DAM API → Supabase のデータ流入経路を確立する。UI なしでデータが流れることを確認。

### タスク

- [ ] Supabase プロジェクト新規作成（無料枠）
- [ ] `sql/schema.sql` を SQL Editor で全実行
- [ ] pgTAP や簡易 SELECT で主要テーブル・関数・RLS が入っていることを確認
- [ ] Supabase Auth で自分用ユーザー 1 人を作成し UUID を控える
- [ ] `poc/karaoke-sync-poc/.env` を作成し、値を埋める
- [ ] `python scripts/sync_scores.py sync --dry-run` でパース成功を確認
- [ ] `python scripts/sync_scores.py sync` で本番取込を実行
- [ ] Supabase Table Editor で以下を目視確認:
  - `songs` に複数曲が入っている
  - `sessions` に時系列のセッションが作られている
  - `scores` の `raw_xml` 列に XML → JSON 変換されたデータが入っている
  - `songs.vocal_range_lowest/highest` がトリガーにより自動セットされている
  - `sessions.score_count / avg_score / max_score` がトリガーにより自動集計されている
  - `sync_logs` に実行履歴が残っている

### 完了基準
- 自分の採点履歴が Supabase に取り込まれ、200 件以上蓄積されている（or 全履歴分）
- `INIT` モード（`python scripts/sync_scores.py init --yes`）で全件リセット→再取込できる

### 懸念される詰まりポイント
- **`parse_failed` ログ**: `parser.py` の属性名が実機 XML と合わない。`show-xml` コマンドで生 XML を見て修正
- **`duplicate key` エラー**: 通常は問題なし（再同期時のスキップ）だが、頻発するなら `dam_scoring_id` のユニーク性を確認
- **Supabase Vault**: `supabase_vault` 拡張が有効化されていない場合、`schema.sql` 実行でエラー。Dashboard > Database > Extensions で有効化

---

## Phase 2: Next.js プロジェクト初期化（所要 1-2 時間）

### 目的
Next.js 15 プロジェクトを立ち上げ、Supabase 認証と基本ナビゲーションを実装。

### タスク

- [ ] `create-next-app` で Next.js 15 プロジェクト作成（TypeScript + Tailwind + App Router）
- [ ] `@supabase/ssr`, `@supabase/supabase-js` をインストール
- [ ] 環境変数設定（`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`）
- [ ] Supabase Auth の `/login` ページ実装（Email OTP or Magic Link）
- [ ] Auth middleware（`middleware.ts`）でログイン必須のルート保護
- [ ] 共通レイアウト: ボトムナビ（モバイル）/ サイドナビ（PC）のスケルトンのみ
- [ ] デザイントークンを `globals.css` と `tailwind.config.ts` に定義（仕様書 section 1 のカラー）
- [ ] 空画面のルート作成: `/`, `/repertoire`, `/history`, `/setlists`, `/settings`

### 完了基準
- ログイン後、空画面のダッシュボードが開ける
- ナビゲーションで画面間を遷移できる
- Tailwind のカラークラス（`bg-bg-base`, `text-neon-pink` 等）が効く

---

## Phase 3: データ取得層の実装（所要 1-2 時間）

### 目的
Supabase から画面に必要なデータを取得する Server Component / Server Action を整備。

### タスク

- [ ] Supabase 用の型生成（`supabase gen types typescript --project-id ...` をスクリプト化）
- [ ] `lib/supabase/server.ts`（Server Component 用の client factory）
- [ ] `lib/supabase/client.ts`（Client Component 用の client factory）
- [ ] データ取得関数（Server Component 直呼び推奨、Server Action でもよい）:
  - `getRepertoire(userId, filters)` - レパ一覧
  - `getRepertoireDetail(userId, songId)` - レパ詳細（scores JOIN）
  - `getDashboardSummary(userId)` - ダッシュボード用 KPI
  - `getRecentScores(userId, limit)` - 最近の歌唱
  - `getHistoryWithSessions(userId, dateRange)` - 採点履歴
  - `getSetlistsWithItems(userId)` - セトリ一覧
- [ ] 動作確認: Server Component からこれらを呼び出してデータが返ることを確認

### 完了基準
- `/repertoire` で DB から取得したデータが画面に表示される（スタイル未適用でも OK）
- RLS が正しく効いていることを確認（別ユーザーでログインして他人のデータが見えないことを確認）

---

## Phase 4: 画面実装（所要 8-15 時間）

### 目的
UI 仕様書の 6 画面を Claude Design のビジュアルに従って実装。

### 優先順位と各画面のポイント

#### 4-1. 画面2 レパートリー一覧 (`/repertoire`)
- **ポイント**: 一覧のパフォーマンス、90+点のネオンピンク glow、フィルタチップ
- **依存**: `getRepertoire()` with filters
- **コンポーネント**: `RepertoireCard`, `FilterChips`, `SortDropdown`, `FAB`

#### 4-2. 画面3 レパ詳細 (`/repertoire/[id]`)
- **ポイント**: レーダーチャート、音域の鍵盤風バー、歌唱推移グラフ
- **依存**: `getRepertoireDetail()`
- **ライブラリ候補**: `recharts`（レーダー + 折れ線）
- **コンポーネント**: `RadarChart`, `VocalRangeBar`, `ScoreHistoryChart`, `MetaInfoPanel`

#### 4-3. 画面1 ダッシュボード (`/`)
- **ポイント**: ヒーローカード、KPI 2x2、最近の歌唱、取り込みボタン
- **依存**: `getDashboardSummary()`, `getRecentScores()`
- **コンポーネント**: `HeroCard`, `KpiTile`, `RecentScoreList`, `SyncButton`

#### 4-4. 画面5 採点履歴一覧 (`/history`)
- **ポイント**: セッション見出し、日付グルーピング、期間タブ
- **依存**: `getHistoryWithSessions()` (`sessions` を親に `scores` を子として JOIN)
- **コンポーネント**: `SessionHeader`, `ScoreRow`, `PeriodTabs`

#### 4-5. 画面4 曲追加モーダル
- **ポイント**: 採点履歴タブ / 手動追加タブの切替、Bottom Sheet（モバイル）
- **依存**: 手動追加は Server Action、履歴から追加は `scores` から重複排除した曲リスト取得

#### 4-6. 画面8 セトリ一覧 (`/setlists`)
- **ポイント**: ピン留めセクション、テンプレからの作成
- **依存**: `getSetlistsWithItems()`

#### 4-7. 画面9 セトリ編集 (`/setlists/[id]`)
- **ポイント**: DnD 並べ替え、曲追加モーダル
- **ライブラリ候補**: `@dnd-kit/core`
- **依存**: `position` の再計算は Server Action 内でトランザクションで実行

### 完了基準
- 各画面が Claude Design のプロトタイプと視覚的に一致
- 実データが流れる
- モバイル/PC 両方でレイアウトが崩れない

---

## Phase 5: 同期スケジュール化 + デプロイ（所要 2-3 時間）

### 目的
日次でデータを自動取込し、Vercel にデプロイ。

### タスク

- [ ] PoC の Python ロジックを TypeScript に移植（または Python をそのまま Vercel Functions で動かすかは要判断）
  - **推奨**: Supabase Edge Function (Deno + TypeScript) で `sync-scores` を実装
  - 参考: `poc/karaoke-sync-poc/src/` のロジックを忠実に TypeScript 化
- [ ] Edge Function から `get_cdm_card_no_for(user_id)` RPC で Vault 復号
- [ ] Vercel Cron または Supabase Cron で毎日 1 回 Edge Function を呼び出す
- [ ] 手動取込ボタン（ダッシュボードの「取り込む」ボタン）を Server Action 経由で同じ Edge Function を呼ぶように接続
- [ ] Vercel にデプロイ、環境変数設定
- [ ] 本番環境で Cron が動くことを確認

### 完了基準
- 毎日自動で最新データが取り込まれる
- ダッシュボードの「取り込む」ボタンでも手動取込できる
- デプロイされた本番 URL で全機能が動作

---

## Phase 6+: 拡張機能（MVP 後）

### 近い将来（数週間〜数ヶ月）

- **オススメ曲**: レパ + 履歴を Claude API に渡して「今日歌うといい曲 3 選」を生成
- **詳細な採点データ表示**: 24 区間ピッチグラフ、Ai 感性グラフ
- **曲別スコア推移画面**: 1 曲の時系列上達グラフ
- **セトリのテンプレ化**: 「盛り上げ系」「バラード系」などの保存機能
- **PWA 化**: ホーム画面追加、オフライン表示

### より先の将来

- **音源解析**: ユーザー手元の合法音源をアップロード → Demucs + RMVPE で音域推定
- **JOYSOUND 対応**: `scoring_type` ENUM 拡張 + 別クライアント実装
- **音域マップ**: 自分の得意音域と曲の音域を重ね合わせ可視化
- **歌唱動画統合**: カラオケで録画した動画と採点結果を紐付け
- **統計ビュー**: 月次サマリ、得意ジャンル分析、上達度スコア
- **ソーシャル**（要慎重検討）: フレンド機能、セトリ共有

---

## 工数見積まとめ

| Phase | 内容 | 見積 |
|---|---|---|
| Phase 1 | データ基盤 | 2-3 時間 |
| Phase 2 | Next.js 初期化 | 1-2 時間 |
| Phase 3 | データ取得層 | 1-2 時間 |
| Phase 4 | 画面実装 | 8-15 時間 |
| Phase 5 | 同期スケジュール + デプロイ | 2-3 時間 |
| **MVP 合計** | | **14-25 時間** |

Claude Code を使えば Phase 2-5 は大幅短縮可能。人間の判断が必要な部分（デザイン微調整、DAM API の属性名修正など）が所要時間の大半を占める。

---

## リスクと対策

| リスク | 発生確率 | 影響 | 対策 |
|---|---|---|---|
| DAM API スキーマ変更 | 中 | 中 | `raw_xml` 永続保存 + パーサ再実行可能設計 |
| DAM API エンドポイント廃止 | 低 | 高 | Tampermonkey 経由の手動取込スクリプトを用意 |
| Supabase 無料枠超過 | 低（個人用途） | 低 | Pro プランへの移行パス確保 |
| Vercel Cron 無料枠制限 | 低 | 低 | GitHub Actions にフォールバック可 |
| 単一ユーザーから多人数化したい | 低 | 中 | マルチテナント設計済み、RLS 有効 |
