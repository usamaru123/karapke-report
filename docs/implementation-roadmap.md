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

---

## Progress Log

作業ごとに日付セクションを追記。**完了** / **未着手** / **ブロック中** の 3 区分で把握。
詳細は設計書や commit 履歴に譲り、ここは一望性を優先した要約に留める。

### 2026-04-22 セッション

#### ✅ 完了

**Phase 6 柱 A (店頭実用化)**
- A1: PWA 化 (manifest, icons, service worker, iOS PWA 対応)
- A2: 音域マッチング (evaluateVocalRange → fits / key_tweak / hard / unknown)
- A3: 推奨 KEY (recommendKey: avg 最優先 + best/count tie-break)

**Auth hardening (ブロッカー 3 件)**
- #1 パスワード再発行フロー (/forgot → /auth/callback PKCE → /reset → /login?reset=1)
- #2 loading.tsx / (app)/error.tsx / global-error.tsx (Next 16.2 unstable_retry 対応)
- #3 オンボーディングバナー (cdm_card_no 未登録時に Dashboard で案内)

**Settings polish (🟡 ゾーン 4 件)**
- #4 表示名編集 (setDisplayName + DisplayNameForm, RLS 経由)
- #5 セットリスト rename + 開催日編集 (updateSetlistMeta, YYYY-MM-DD 厳格検証)
- #6 同期ログ閲覧画面 (/settings/sync-logs, 直近 30 件, status 別アイコン)
- #7 cron 失敗 Discord 通知 (GH Actions, optional DISCORD_WEBHOOK_URL secret)

**テスト基盤**
- Vitest 4.1.5 導入 (Next 16 公式レシピ準拠、node 環境、resolve.tsconfigPaths)
- 純粋ロジック抽出リファクタ: `lib/validation/`, `lib/format/`
- 計 **148 テスト / 16 ファイル** 全緑 (validation / formatting / midi / vocal-range / key-recommendation / advice 各ルール / extractors / orchestrator)

**Advice engine** (設計書: `docs/feature-design/advice-engine.md`)
- S0: DAM raw_xml 実データ検証 (1 件目視 + API 直叩き全 137 フィールド列挙)
- S0.5: vibratoType 数値コード → 1-indexed 15 種マッピング仮説 (medium confidence)
- S1: `scores.intonation SMALLINT` 列追加 + マイグレーション + バックフィル 200/200 成功
- S1: `lib/advice/raw-xml-extract.ts` 両 prefix (@, @_) 対応の純粋抽出関数群
- S1: `lib/advice/vibrato-type-map.ts` + `describeVibratoType`
- S2a: 単発ルール 6 本 (R01 素点/ボーナス分解 / R02 抑揚→表現力上限 / R04 レーダー最弱軸 / R06 リズム走り / R09 キー適合 / R10 Heart ルーレット注記)
- S2a: `diagnose-score.ts` orchestrator + sortFindings (severity > confidence > ruleId)
- S4: UI (AdviceSection / FindingCard / SourceBadge / 曲詳細ページに統合)

### 2026-04-22 続き: S2b 技法系ルール 6 本

#### ✅ 完了

- `ScoreInput.raw_xml` フィールド追加 (rules が extractors 越しに任意フィールド読めるように)
- `thresholds.ts` に R03/R05/R07/R11/R12/R14 の閾値を集約 (根拠コメント付き)
- R03 音程スイートスポット (`radarChartPitch` 95↑ warn / 85↓ tip、inferred+low)
- R05 ビブラート型 (N / ちりめん A 系 / 非ボックス D-H / 推奨 B-3 C-3 / 持続 < 5s、official+empirical)
- R07 技法単調性 (8 種技法の使用カテゴリ数 ≤ 2 で発火、使用技法名を明記)
- R11 Ai 感性 減点区間 (24 区間の最大減点 > 30 で発火、B'01/B'10 セクションラベル付与)
- R12 全国平均比較 (軸ごとに自 vs 平均、-5↓ = 伸びしろ tip / +10↑ = 得意 info、最大 1 件ずつ)
- R14 メロディセクション区分 (B'01 群 vs B'10 群 の平均音程差 ≥ 8、inferred+low、抽象ラベル)
- orchestrator (`diagnose-score.ts`) に 6 本登録 → 計 12 単発ルール運用
- 追加テスト 6 ファイル + `buildRawXml` ヘルパで両 prefix 透過 + null 入力耐性確認
- 計 **183 テスト / 22 ファイル** 全緑

#### ロードマップ消化

- S2b 完了 → 残る単発系は S2c (R08) のみ

---

### 2026-04-22 運用・整理

**運用・整理**
- `CLAUDE.md` 新規 (デプロイ手順 / push 認証トラブルの PAT 回避策 / secrets 管理 / .env キー一覧)
- PoC (`poc/karaoke-sync-poc/`) 退役: Python 本体・venv 削除 (-92 MB)、`.env` を repo root に統合
- `docs/poc-archive.md` 新規 (PoC → Edge Function 移植マッピング + INIT モード SQL 版 + デバッグ curl 版)
- `scripts/*.py` 5 本の ENV_PATH を `ROOT / ".env"` に一括書き換え
- `.gitignore` で root `.env` 保護、`**/.venv/` へ汎化

#### ⚠️ 未着手 (優先順位順)

| 項目 | 想定工数 | ブロッカー |
|---|---|---|
| **歌唱詳細画面 `/scores/[id]`** (履歴 ScoreRow から遷移、レーダー・24 区間・全技法カウント・単発アドバイスを一画面に) | 2-2.5h | なし (既存 ScoreRadarChart / AdviceSection 流用可) |
| Advice S2c 区間系 (R08 24 区間弱点) | 1h | なし |
| Advice S2d 要検証系 (R13 maxTotalPoints) | 1.5h | maxTotalPoints 意味の別曲サンプル検証 |
| Advice S3 集計診断 (R20-R24: recommendKey 統合、伸び悩み、改善トレンド、散布診断、得意→苦手転用) | 2h | S2a 済 |
| Advice S6 フィードバック収集 (👍/👎 簡易 log → 閾値較正素材) | 2h | S4 済 |
| Ai Heart 別エンドポイント調査 (`GetScoringHeartListXML.do` 仮称) | 不明 | 実機データアクセス |
| GCM `shun19991214` 根本対処 (`git credential fill` 出力診断) | 15 分 | 未着手 |
| `http.sslVerify=false` グローバル解除 | 5 分 | - |
| 月次サマリ / 統計ビュー (`/stats`) | 2-3h | データ蓄積量次第 |
| セトリのテンプレ化 (`setlists.is_template`) | 3-4h | DB マイグレーション必要 |
| オススメ曲 (Claude API 連携) | 3-4h | `ANTHROPIC_API_KEY` 準備 + 料金設定 |
| 24 区間ピッチグラフ UI | 4h+ | S2c と合わせて検討 |
| Phase 6+ 将来機能 (音源解析 / JOYSOUND / 歌唱動画統合 / ソーシャル) | 週-月 | ワークストリーム分離必要 |

#### 🟦 ブロック中・監視のみ

- 本番で S4 の実データ挙動確認 → 閾値 / 文言の微調整 (ユーザー確認待ち)
- GCM 資格情報問題 (push は PAT 埋め込み方式で暫定回避中)

