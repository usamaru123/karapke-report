# Tickets

**正典**: このファイル。作業の開始・完了・ブロック発生のたびに更新する。
過去の時系列の変更履歴は `docs/implementation-roadmap.md` の Progress Log
（2026-04-22 までで更新停止、歴史的ログとして保持）。

## 運用ルール

### チケット ID

`{CATEGORY}-{TOPIC}` 形式。連番ではなく文脈ある識別子にする。

| Category | 用途 | 例 |
|---|---|---|
| `ADV` | Advice engine (ルール・UI) | `ADV-S2b`, `ADV-VERIFY` |
| `FEAT` | ユーザー向け新機能 | `FEAT-SETLIST-RANDOM` |
| `UX` | 既存機能の UX 改善 | `UX-CONFIDENCE-PICK` |
| `PERF` | パフォーマンス / 最適化 | `PERF-SYNC-INCR` |
| `DATA` | DB スキーマ / データ整備 | `DATA-MAXTOTAL-MEANING` |
| `INFRA` | CI / デプロイ / 認証基盤 | `INFRA-GCM-FIX` |
| `DOCS` | ドキュメント整備 | `DOCS-TICKETS` |
| `RESEARCH` | 調査のみ (実装伴わない) | `RESEARCH-HEART-ENDPOINT` |

### ステータス (カラム)

- 🟣 **In Progress**: 今着手中。同時 1-2 件まで
- 🟦 **Blocked**: 外部要因 (ユーザー操作・API key・実データ等) 待ち
- 📋 **Backlog**: 未着手、優先度順に並べる
- ✅ **Done**: 完了。直近 20 件まで本ファイルに保持、それ以前は `archive/` へ

### チケット本体のフォーマット

```markdown
### [ID] 短いタイトル
- Created / Updated / (Completed): YYYY-MM-DD
- Priority: high | medium | low
- Labels: `category`, 追加ラベル (optional)
- Blocker: 他チケット ID or 外部要因 (Blocked のみ)
- Commit: `<SHA>` (Done のみ)

詳細 (目的 / 受入条件 / 実装メモ)。1-5 行程度に収める。
```

### 更新タイミング

| 操作 | 必須アクション |
|---|---|
| 作業に着手 | Backlog → In Progress、Updated 日付更新 |
| 完了 | In Progress → Done、Completed 日付 + commit SHA |
| 外部要因でストップ | → Blocked、Blocker 記述 |
| 新規タスク発見 | Backlog に追加 (適切な Priority 付与) |
| 着手取りやめ | Cancelled としてコメント残しアーカイブへ |

既存チケットを書き換える時は Updated を上書きしてよい。**履歴を残したければ git 履歴で**。

---

## 🟣 In Progress

_(currently empty — P0 UX batch shipped, see Done)_

---

## 🟦 Blocked

### [ADV-VERIFY-THRESHOLDS] 本番実データで advice ルールの閾値検証
- Created: 2026-04-22 / Updated: 2026-04-22
- Priority: high
- Labels: `ADV`, `manual-test`
- Blocker: ユーザーの実運用フィードバック (S6 の 👍/👎 ボタン経由で蓄積中)

19 本のルール (R01-R14 の大半 + R20-R24) を 243 テストで緑にした状態。
閾値 (thresholds.ts) は有志スコアラー実測ベースの仮説。ユーザーが本番で
歌唱 → アドバイスカードが表示される → 👍/👎 を押す → 一定量貯まったら
閾値を較正、という継続ループ。現時点で実装側から能動的にやることはなく、
フィードバックが溜まるまでは待機。

### [DATA-MAXTOTAL-MEANING] `maxTotalPoints` フィールドの意味確定
- Created: 2026-04-22 / Updated: 2026-04-22
- Priority: medium
- Labels: `DATA`, `RESEARCH`
- Blocker: 同一曲複数歌唱サンプルでの挙動比較が必要

Stage 0 で 5 サンプル検証した時点では「その歌唱の到達可能最大点」仮説が
一番近そうだが確証なし。別曲・別キー・別同期日の複数レコードを比較する
ことで意味が確定できる。R13 (song-ceiling) は現在 confidence=low、意味
確定後に medium/high へ格上げ + severity 調整を検討。

### [DATA-VIBRATOTYPE-FULL-DIST] vibratoType 全 200 件分布でマッピング仮説を実証
- Created: 2026-04-22 / Updated: 2026-04-22
- Priority: low
- Labels: `DATA`, `RESEARCH`
- Blocker: DAM API からの全件取得が必要 (ユーザー cdmCardNo)

5 件観測で `0..14 → N / A-1 / .. / H` の 1-indexed 仮説を立てた
(`lib/advice/vibrato-type-map.ts`)。200 件分布を取れば N が 0 か 15 か
判定可能。R05 (vibrato-type) の confidence を medium → high に上げる
根拠になる。

---

## 📋 Backlog

### 🔶 P1 UX バッチ

#### [UX-ACCESSIBILITY-01] 色弱対応 + 暗所コントラスト + <80点の色 + 片手操作
- Created: 2026-04-22
- Priority: medium / Labels: `UX`, `a11y`

- ScoreBadge の色のみ判別を **色 + 形 or テキスト** 併用
- <80 点のグレー表示を濃い青系に変更 (頑張った感を保持)
- BottomNav + FAB を親指エリア (下半分) に集約済み確認
- 暗所視認性: 彩度の高いネオン色を暗所モードでは落とす

#### [UX-ONBOARDING-DAMCARD] DAM カード登録チュートリアル
- Created: 2026-04-22
- Priority: medium / Labels: `UX`, `onboarding`

カード番号取得手順をスクショ + ステップで案内。`/settings` 初回表示時 or Home の
OnboardingBanner から遷移。離脱率 No.1 ポイント。

#### [UX-EMPTY-STATES] 空状態 CTA 統一
- Created: 2026-04-22
- Priority: medium / Labels: `UX`

HeroCard null / レパ 0 件 / 履歴 0 件 / セトリ 0 件の文言と CTA を統一コンポーネント化。
「最初の 1 曲を記録してみよう」等の次アクションを常に明示。

#### [UX-ADVICE-DATA-LABELS] アドバイス「データ期間」ラベル統一
- Created: 2026-04-22
- Priority: medium / Labels: `UX`, `ADV`

「直近 10 回の傾向」などの曖昧表現を `直近 N 件 (YYYY/MM/DD - YYYY/MM/DD)` 形式で
統一。推定値注釈も共通コンポーネント `<EstimatedNote />` 化。

#### [UX-GLOBAL-FAB] FAB をホーム/履歴にも表示
- Created: 2026-04-22
- Priority: medium / Labels: `UX`

現在レパ画面のみの `AddSongFab` を全画面共通に昇格。どこからでも曲追加/記録可能に。

#### [FEAT-RANGE-FILTER] 音域帯でレパ検索
- Created: 2026-04-22
- Priority: medium / Labels: `FEAT`, `repertoire`

`songs.range_low/high` と user の voice_range を使って「声域内だけ表示」フィルタ。
FilterChips に 3 軸目として追加。

#### [FEAT-HISTORY-FILTERS-EXT] 履歴に日付範囲 + 点数範囲 + 機種フィルタ
- Created: 2026-04-22
- Priority: medium / Labels: `FEAT`, `history`

HistoryToolbar に 3 フィルタ追加。`getHistoryWithSessions` を拡張。

#### [FEAT-SETLIST-BALANCE-WARN] セトリバランス警告
- Created: 2026-04-22
- Priority: medium / Labels: `FEAT`, `setlist`

「高音連続 3 曲」「バラード 3 連」等を `songs.range_high` と BPM (後日) で検出、
セトリ編集画面に警告バナー表示。

#### [FEAT-ACHIEVEMENT-CARD] 自己ベスト更新演出 + 共有カード PNG
- Created: 2026-04-22
- Priority: medium / Labels: `FEAT`, `share`

新スコア取り込み時に自己ベスト検出 → ネオンパルス + PNG 生成 (曲名 + 点数 + レーダー)。
SNS 共有で自然拡散を狙う。ライブラリ: `@vercel/og` or `html-to-image`。

#### [FEAT-CSV-EXPORT] データエクスポート (CSV/JSON)
- Created: 2026-04-22
- Priority: medium / Labels: `FEAT`, `data`

`/settings` にエクスポートボタン。scores / repertoire / setlists を選択式でダウンロード。

#### [FEAT-CALENDAR-ICS] セトリを .ics 出力
- Created: 2026-04-22
- Priority: low / Labels: `FEAT`, `setlist`

`scheduled_for` があるセトリを .ics ダウンロード → Google カレンダー等に取り込み。

---

### 🔷 P2 UX バッチ (ADV-VERIFY-THRESHOLDS 後)

#### [ADV-PERSONALIZED-DRILL] 弱点 × 難所 パーソナライズ助言
- Created: 2026-04-22
- Priority: low / Labels: `ADV`, `FEAT`
- Blocker: `ADV-VERIFY-THRESHOLDS`

ユーザの弱点項目 (表現力が平均より低い等) とその曲の難所 (サビ高音等) を掛け合わせた
パーソナライズ助言。閾値較正完了後に着手。

#### [FEAT-PRACTICE-PLAN] 練習プラン (週間 3 曲)
- Created: 2026-04-22
- Priority: low / Labels: `FEAT`

「今週はこの 3 曲を集中練習」プラン生成 + 進捗表示。アドバイスエンジン信頼性確立後。

#### [FEAT-GOAL-SETTING] 目標設定 + 達成演出
- Created: 2026-04-22
- Priority: low / Labels: `FEAT`

「今月 20 曲」「しるしで 96 点」等の目標設定 + 進捗バー + 達成時祝いアニメ。

#### [UX-WEEKDAY-TIME-ANALYSIS] 曜日 / 時間帯別パフォーマンス
- Created: 2026-04-22
- Priority: low / Labels: `UX`, `stats`

`/stats` に曜日ヒートマップ + 時間帯別平均点。`sang_at` があれば実装可能。

---

### 💤 Phase 6+ / 要調査

#### [RESEARCH-EXTERNAL-METADATA] 歌詞/タイアップ/BPM 取得ソース調査
- Created: 2026-04-22
- Priority: low / Labels: `RESEARCH`

歌詞検索・タイアップ (アニメ/ドラマ)・ジャンル・年代・BPM の公式/非公式取得手段と
ライセンス調査。JASRAC 有料 API、非公式スクレイピングの法的リスク等。

#### [FEAT-LIVE-MODE] カラオケ中ライブモード
- Created: 2026-04-22
- Priority: low / Labels: `FEAT`, `Phase6+`

全画面で次曲 / キー設定を大文字表示。実需要が不明なのでユーザーテスト後に判断。

#### [FEAT-OCR] 採点画面スクショ OCR
- Created: 2026-04-22
- Priority: low / Labels: `FEAT`, `Phase6+`

DAM 自動同期で十分なため主フローでは不要。JOYSOUND 対応 or 友人アカウント記録の
避難路として。Vision API コスト見積 + 誤認識リカバリ UI 設計要。

### [FEAT-SUGGEST-CLAUDE] オススメ曲 (Claude API 連携)
- Created: 2026-04-22 / Updated: 2026-04-22
- Priority: medium
- Labels: `FEAT`, `external-api`, `cost`
- Pre-requisite: `ANTHROPIC_API_KEY` の用意と月額予算策定

レパ + 履歴を Claude API に投げて「今日歌うといい曲 3 選」を生成。料金
発生とレート制限考慮。プロンプト設計 + キャッシュ戦略 (同一入力なら結果
再利用) 必要。`docs/feature-design/suggest-songs.md` を先行作成推奨。

### [RESEARCH-HEART-ENDPOINT] Ai Heart 別エンドポイント調査
- Created: 2026-04-22 / Updated: 2026-04-22
- Priority: low
- Labels: `RESEARCH`, `ADV`
- Blocker: 実機からの Heart 同期レスポンスが必要 (ユーザーが Heart 対応機種で歌唱)

`GetScoringAiListXML.do` は AI 専用。Heart 用 endpoint は名称不明。
コミュニティ実装 (llechi/karaoke-api など) を先行確認。解明後、
`scoring_type='ai_heart'` のデータが流れるようになれば R01 の Heart 対応、
ハートボーナス構造の解析、R10 の有意味化が可能に。

### [FEAT-AUDIO-ANALYSIS] 音源解析による音域推定 (Demucs + RMVPE)
- Created: 2026-04-22 / Updated: 2026-04-22
- Priority: low
- Labels: `FEAT`, `Phase6+`

Phase 6+ 将来。Python ML 環境、別ワークストリーム。合法音源アップロード
→ 分離 + ピッチ抽出で音域推定。Supabase Edge Function では非対応、別
サーバが要る。

### [FEAT-JOYSOUND] JOYSOUND 対応
- Created: 2026-04-22 / Updated: 2026-04-22
- Priority: low
- Labels: `FEAT`, `Phase6+`

`scoring_type` ENUM 拡張 + 別 XML クライアント実装。実データアクセス要。

### [FEAT-VIDEO] 歌唱動画統合
- Created: 2026-04-22 / Updated: 2026-04-22
- Priority: low
- Labels: `FEAT`, `Phase6+`
- Blocker: Supabase Storage 料金 / 著作権整理

### [FEAT-SOCIAL] ソーシャル機能 (フレンド / セトリ共有)
- Created: 2026-04-22 / Updated: 2026-04-22
- Priority: low
- Labels: `FEAT`, `Phase6+`, `needs-design`

ロードマップで「要慎重検討」扱い。プライバシー設計必須。

---

## ✅ Done (直近 20 件)

### [UX-WARMUP-CURVE] 曲順 × 得点の平均チャート (喉の温まり曲線)
- Completed: 2026-04-22 / (next commit)
- Labels: `UX`, `stats`

`/stats` に「曲順別 平均点」BarChart 追加。`getSongOrderPerformance()` で
`scores.session_id` グルーピング → `sung_at ASC` で position 振り → position
ごとに mean/median/max/sampleSize 集計。peakPosition (サンプル 3 以上で最高
平均) を識別して neon-pink で強調、低サンプル (< 3) は薄色でフェード。全体
平均を ReferenceLine として重ね、「調子のピーク: N 曲目」インサイト文併記。

### 🔥 P0 UX バッチ (2026-04-22) — 9 件同時リリース
- Completed: 2026-04-22 / Commits: `2998241` (Home) + `0f6e8fc` (Repertoire) + `c791912` (Misc)
- Labels: `UX`, `home`, `repertoire`, `history`, `navigation`

1. **[UX-BOTTOMNAV-LABELS]** `c791912` — BottomNav のラベル常時表示は既存、「レパ」→「曲」リネーム
2. **[UX-CONFIDENCE-OPTIMISTIC]** 検証のみ — 既に楽観 UI 実装済を確認 (state 即時 → rollback)
3. **[UX-HISTORY-SESSION-SUMMARY]** `c791912` — `SessionGroup` 見出しに 平均 / 最高 / 曲数
4. **[UX-REPERTOIRE-SORT]** `0f6e8fc` — 4 → 8 種に拡充 (avg/count/growth/stability 追加)、`parseSort` export 化
5. **[UX-REPERTOIRE-DYNAMIC-BADGES]** `0f6e8fc` — 「あと N 点でベスト」「N 日歌ってない」badge
6. **[UX-REPERTOIRE-SPARKLINE]** `0f6e8fc` — 自前 SVG `<Sparkline>` component、カード右上に直近 5 件折れ線
7. **[UX-FILTER-SUMMARY-BAR]** `0f6e8fc` — 適用中フィルタ chip + 件数 + 一括クリア、フィルタ無しでは非表示
8. **[UX-HOME-NEXT-SESSION]** `2998241` — `getNextScheduledSetlist()` query + `NextSessionBanner` (今日/明日/あと N 日)
9. **[UX-HOME-SPARKLINE]** `2998241` — `getMonthlyKpiTrend(6)` query + KpiGrid 4 タイルに 6ヶ月スパークライン + 前月差分

データ層拡張: `RepertoireWithMeta` に `avg_score` / `score_count` / `std_score` / `growth_score` /
`recent_scores` / `days_since_last_sung` を追加。`Date.now()` は query 層でスナップして render 側は純粋に。

### [PERF-SYNC-INCR] インクリメンタル同期で手動取り込みを高速化
- Completed: 2026-04-22 / Commit: `de619d0`
- Labels: `PERF`, `edge-function`
- 参照: `docs/tech-research/20260422-sync-performance.md`

`sync.ts` に `incremental` オプション (default true) を追加。ユーザの既知
`dam_scoring_id` を事前 Set 化し、`iterAll` ループ中で consecutive 既知 hit
が `incrementalStopAfter`(=1) に達したら早期 break。全件既知なら page 1 の
最初のレコードで打ち切りでき、DB 側の UNIQUE 制約は backup safety net として
維持。`SyncResult` に `stopped_early` 追加。

### [FEAT-SETLIST-TEMPLATE] セトリテンプレ化
- Completed: 2026-04-22 / Commit: `3b04939`
- Labels: `FEAT`, `DB-migration`

migration 009 で `setlists.is_template BOOLEAN` + `setlists.template_source_id
UUID` 追加 (+ 部分 index `setlists_templates`)。`createSetlist` に
`fromTemplateId` を足して setlist_items を position 0..N-1 で複製。
`toggleSetlistTemplate` action 新設。`/setlists` ページは 3 セクション
(pinned / saved / templates) に再構成、`/setlists/new` にテンプレドロップダウン、
SetlistHeader にテンプレ化 toggle (BookTemplate icon) + バナーを追加。
**要 Supabase SQL Editor で migration 009 適用**。

### [UX-ADDSONG-HISTORY-TAB-REMOVE] 曲追加モーダルから「採点履歴から」タブ削除
- Completed: 2026-04-22 / (next commit)
- Labels: `UX`, `DATA`

`AddSongModal` のタブ切替を廃止し手動追加専用に。歌った曲は sync で
自動 unset 追加されるためタブが冗長。`getAddableScoredSongs` / `AddableSong` /
`AddFromHistoryTab.tsx` も削除。手動追加モーダルに「DAM にない曲・まだ歌って
いない曲を登録する用途」と説明文追加。

### [DATA-BACKFILL-REPERTOIRE] 過去の歌唱曲を repertoire に一括 backfill
- Completed: 2026-04-22 / (next commit)
- Labels: `DATA`, `DB-migration`

migration 008 で `scores` に存在するが `repertoire` に無い
(user_id, song_id) を全て `confidence='unset'` として INSERT。Edge Function
が自動追加するようになった時点より前の歌唱曲を救済。冪等 (NOT EXISTS)。

### [BUG-CONFIDENCE-DEFAULT-UNSET] 新規曲 / デフォルト曲を 'unset' に統一
- Completed: 2026-04-22 / Commit: `e2ab0ce`
- Labels: `BUG`, `DATA`, `DB-migration`

`addToRepertoire` が confidence を指定していなかったため DB DEFAULT の
'normal' が入り、未設定フィルタに引っかからない問題。修正: schema.sql の
DEFAULT を 'unset' に、migration 007 で既存 'normal' 行を全て 'unset'
へリセット (ユーザー要望: 意図的 normal もリセットで OK)、
`addToRepertoire` にも明示 `confidence: 'unset'` を追加。

### [BUG-REPERTOIRE-QUICKPICK-NAV] レパ一覧の confidence quick-pick で詳細遷移
- Completed: 2026-04-22 / (next commit)
- Labels: `BUG`, `UX`

Link を `absolute inset-0 z-0`、quick-pick 側を `relative z-10` +
`pointer-events-auto` に再レイアウトして競合解消。

### [UX-REPERTOIRE-CARD-COMPACT] レパカード: タグ削除 + quick-pick 大型化
- Completed: 2026-04-22 / (next commit)

`#JPOP` などタグ行を削除、quick-pick を h-7 / text-xs に拡大、色分け強化。

### [UX-REPERTOIRE-FILTER-COMBO] status × confidence 複合フィルタ
- Completed: 2026-04-22 / (next commit)

`getRepertoire({ status, confidence })` に二軸化。URL:
`?status=recent&confidence=practicing`。FilterChips は 2 グループ独立 toggle。

### [UX-PITCH-CHART-READABILITY] 24 区間音程チャート可読性改善
- Completed: 2026-04-22 / (next commit)

Ai 減点を隣接バーに分離 (group bars)、X 軸 5 刻みラベル、高さ 180→240px。

### [UX-RADAR-NUMBERS] レーダーに実数値併記
- Completed: 2026-04-22 / (next commit)

PolarAngleAxis の tick を `軸名 / 数値` の 2 行 SVG に。V&L はラベル短縮。

### [UX-HISTORY-FILTER-SORT] 履歴: 期間タブ削除 + q/range/sort
- Completed: 2026-04-22 / (next commit)

`PeriodTabs` 削除、`HistoryToolbar` 新規。検索・点数範囲 chip・ソート select
を `getHistoryWithSessions` と連携。

### [UX-SYNC-BUTTON-MOVE] 同期ボタンを Home → Settings
- Completed: 2026-04-22 / (next commit)

SyncCard を `/settings` に移植、Dashboard からは削除。cron で毎日自動。

### [UX-STATS-ANALYSIS] 統計ページに分析インサイト
- Completed: 2026-04-22 / (next commit)

`/stats` に `deriveInsights()` で導出した月次ハイライト文と、
`diagnoseHistoryOverall` による R21/R23/R24 findings カードを追加。

### [UX-REPERTOIRE-DETAIL-AGGR-REMOVE] 曲詳細から cross-song 集計除去
- Completed: 2026-04-22 / (next commit)

`diagnoseHistory` を `ForSong` (R20/R22) と `Overall` (R21/R23/R24) に
分離。曲詳細は ForSong のみ、全体系は /stats 専用に。

### [UX-HOME-STATS] Home 情報量拡充 + /stats ドリルダウン
- Completed: 2026-04-22 / Commit: `76c5f92`
- Labels: `UX`, `FEAT`

MonthlySummaryCard を Dashboard に、`/stats` 新設 (12 ヶ月 bar+line、
レーダー、ベスト10)。

### [UX-CONFIDENCE-UNSET-AUTO] confidence 'unset' + 自動追加 + quick-pick
- Completed: 2026-04-22 / Commit: `76c5f92`
- Labels: `UX`, `DB-migration`, `edge-function`

migration 006 で `unset` 追加、sync で自動 INSERT、`ConfidenceQuickPick`
で一覧から即切替。

### [UX-PITCH-RECHARTS] 24 区間 recharts 化
- Completed: 2026-04-22 / Commit: `76c5f92`
- Labels: `UX`

CSS バー → recharts BarChart。最弱 ring、平均 ReferenceLine、Ai 減点
第 2 シリーズ、日本語 Tooltip。

### [FEAT-SETLIST-RANDOM] セトリランダム追加
- Completed: 2026-04-22 / Commit: `76c5f92`
- Labels: `FEAT`

`randomFillSetlist` action + RandomFillButton (+3/+5/+10)。confidence
バケット絞り込み + Fisher-Yates + バルク INSERT。

### [RESEARCH-SYNC-PERF] 同期パフォーマンス 調査
- Completed: 2026-04-22 / Commit: `9e4d1c1`
- Labels: `RESEARCH`, `PERF`

`docs/tech-research/20260422-sync-performance.md`。定時バッチは既稼働
(GH Actions cron)、手動ボタン遅延の 3 短縮案を提示。実装は
`[PERF-SYNC-INCR]` として Backlog へ分離。

### [FEAT-SCORE-DETAIL] 歌唱詳細画面 `/scores/[id]`
- Completed: 2026-04-22 / Commit: `76c5f92`
- Labels: `FEAT`

レーダー + 24 区間 + 8 技法 + 単発アドバイス。`/history` ScoreRow から
Link 遷移。

### [ADV-S6] Advice S6 フィードバック収集
- Completed: 2026-04-22 / Commit: `76c5f92`
- Labels: `ADV`, `DB-migration`

migration 005 で `advice_feedback` テーブル、👍/👎 ボタン + server action。
[ADV-VERIFY-THRESHOLDS] の入力源。

### [INFRA-GCM-FIX] GitHub push 認証 根本対処
- Completed: 2026-04-22 / Commit: `76c5f92`
- Labels: `INFRA`

`.gitconfig` の `credential.https://github.com.helper=!gh.exe` を unset、
`http.sslVerify` 再有効化。以降は manager 経由で `usamaru123` 認証。

### [DATA-SONG-MARKER-BRACKETS] 版マーカー regex を `[...]` + `良音` に拡張
- Completed: 2026-04-22 / Commit: `694389f`
- Labels: `DATA`

migration 004 + parser 更新。`[プロオケ]` `[良音]` も剥離対象に。

### [DATA-SONG-MERGE] 同曲の版違い ((プロオケ)/(生音)) 統合
- Completed: 2026-04-22 / Commit: `3b29bdc` + `28e4afb` + `4fdfd42`
- Labels: `DATA`, `DB-migration`

`lib/song-title.ts` + parser.ts の duplicate + migration 003。既存 200
件の大半が正規化統合された。

### [UX-CONFIDENCE-ENUM-5] confidence_level を 5 値に拡張 + フィルタ
- Completed: 2026-04-22 / Commit: `3b29bdc`
- Labels: `UX`, `DB-migration`

migration 002 (`wanna_sing` / `shelf` 追加)、RepertoireList にグループ
chip 2 段目追加。

### [ADV-ROBUST-STATS] アドバイス入力をロバスト統計化
- Completed: 2026-04-22 / Commit: `3b29bdc`
- Labels: `ADV`

直近 10 件同曲スコアを 25% トリム平均で集約。単発外れ値で findings が
ブレる問題を解消。

### [UX-SCORE-BADGE-5] ScoreBadge 5 段階色分け (98+/95+/90+/80+/<80)
- Completed: 2026-04-22 / Commit: `3b29bdc`
- Labels: `UX`

### [ADV-S3] Advice S3 集計診断 5 本 (R20-R24)
- Completed: 2026-04-22 / Commit: `4bf6655`

### [ADV-S2c-S2d] Advice R08 / R13
- Completed: 2026-04-22 / Commit: `4bf6655`

### [ADV-S2b] Advice S2b 技法系 6 本 (R03/R05/R07/R11/R12/R14)
- Completed: 2026-04-22 / Commit: `0862c9c`

### [ADV-S4-UI] Advice UI (AdviceSection / FindingCard / SourceBadge)
- Completed: 2026-04-22 / Commit: `c3f785e`

### [ADV-S2a] Advice S2a 単発ルール 6 本 (R01/R02/R04/R06/R09/R10)
- Completed: 2026-04-22 / Commit: `c3f785e`

### [ADV-S1] raw_xml extractors + intonation 列 + vibrato-type map
- Completed: 2026-04-22 / Commit: `c3f785e`

### [DOCS-TICKETS] チケット管理化 (この整理)
- Completed: 2026-04-22 / Commit: (現在のコミット)
- Labels: `DOCS`

古い Progress Log 形式 (日付ごとに新規セクション積む) は時系列把握には
良かったが、「今 open なタスクの一覧」が散乱し把握困難だった。
Kanban 風 4 カラムに再編、既存 Progress Log は歴史的ログとして保持。
