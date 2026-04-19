# 📦 Claude Code Handoff Package

カラオケレパートリー管理アプリの実装引き継ぎパッケージ。

## 🎯 このアプリは何か

DAM カラオケで歌った自分の採点履歴を取り込み、**レパートリー管理・得点集計とグラフ化・セトリ作成・レコメンド**を統合した、個人用の歌唱データダッシュボード Web アプリ。単一ユーザー想定だが、将来のマルチテナント化も視野に入れた設計。

- **フロント**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **DB**: Supabase (PostgreSQL + Auth + Vault)
- **ホスティング**: Vercel
- **スマホ/PC 両対応のレスポンシブ**、日本語 UI、ダークモード固定

## 🤖 Harness Engineering 前提での利用

このパッケージは **Harness Engineering (Planner / Generator / Evaluator の multi-agent loop)** で自律的に実装されることを想定して構築されている。

具体的には:

- **AGENT_TASKS/** 配下の原子タスクを Planner が順序付け
- **Generator Agent** が各タスクを実装
- **Evaluator Agent** が EVALUATION.md の基準で pass/fail 判定
- 失敗時は retry、最大回数超えたら human escalation
- **HUMAN_CHECKPOINTS.md** で明示された人間介入ポイントでは自動で停止

ハーネスの起動方法・運用方法は **CLAUDE_CODE_HARNESS.md** を参照。

手動で進めたい場合は HANDOFF.md の「最初にやること」から順に手動実行してもよい (完全自律 / 半自動 / 完全手動のいずれも可能)。

## 📂 このパッケージの構成

```
karaoke-handoff/
├── HANDOFF.md                          ← この文書（最初に読む）
├── EVALUATION.md                       ← 自動評価基準（Evaluator 必読）
├── EVALUATOR_PROMPTS.md                ← Evaluator Agent のプロンプト集
├── HUMAN_CHECKPOINTS.md                ← 人間介入が必要なポイント
├── CLAUDE_CODE_HARNESS.md              ← Harness 実行設定
├── AGENT_TASKS/                        ← 原子タスク群（30 タスク）
│   ├── README.md                       ← 依存関係グラフ
│   └── P{Phase}-{N}-{name}.md          ← 各タスク定義
├── docs/
│   ├── karaoke-app-design-spec.md      ← UI 仕様書（6画面の詳細）
│   ├── data-model.md                   ← データモデル設計書
│   ├── implementation-roadmap.md       ← Phase 別実装計画（人間向け）
│   ├── nextjs-project-structure.md     ← Next.js ディレクトリ構造の想定
│   └── claude-design-integration.md    ← Claude Design Hand off 使い方
├── sql/
│   └── schema.sql                      ← Supabase DDL（読取専用）
├── poc/
│   └── karaoke-sync-poc/               ← Python 取込スクリプト（検証済み）
│       └── src/parser.py               ← ★ 本番でも流用推奨
└── prototypes/                         ← Claude Design のスクショ
    ├── 01-repertoire.png
    ├── 02-dashboard.png
    └── 03-repertoire-detail.png
```

## ⏩ 読む順序（役割別）

### 🧑 Human Operator（あなた）

1. **`HANDOFF.md`（この文書）** - 全体像把握
2. **`HUMAN_CHECKPOINTS.md`** - 自分がやるべき作業の一覧
3. **`docs/karaoke-app-design-spec.md`** - 何を作るか（UI 仕様）
4. **`docs/implementation-roadmap.md`** - Phase 毎の実装順と工数
5. **`CLAUDE_CODE_HARNESS.md`** - Harness の起動方法

### 🤖 Planner Agent

1. **`HANDOFF.md`** - プロジェクト概要
2. **`AGENT_TASKS/README.md`** - 依存関係グラフ
3. **`EVALUATION.md`** - 完了判定基準
4. **`HUMAN_CHECKPOINTS.md`** - 自動化できない領域の把握

### 🤖 Generator Agent

各タスク実行時:

1. 指定された **`AGENT_TASKS/P{X}-{Y}-*.md`** を読む
2. 必要に応じて **`docs/*.md`**, **`sql/schema.sql`**, **`poc/`** を参照
3. Steps を実行して Outputs を生成

### 🤖 Evaluator Agent

1. **`EVALUATION.md`** - 判定基準
2. **`EVALUATOR_PROMPTS.md`** - プロンプトテンプレート集
3. 評価対象タスクの **`AGENT_TASKS/*.md`** の「Evaluation」セクション

## 🏁 最初にやること（Phase 1）

### 1. Supabase プロジェクト作成

```
1. https://supabase.com でプロジェクトを新規作成（無料枠でOK）
2. SQL Editor で sql/schema.sql を全実行
3. Authentication > Users で自分用ユーザーを1人作成
4. その user UUID を控える
```

### 2. PoC を動かす（データが流れることを確認）

```bash
cd poc/karaoke-sync-poc
python -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env
# .env を編集:
#   DAM_CDM_CARD_NO  (ユーザー本人から受領、または実機検証済みの値)
#   SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY
#   TARGET_USER_ID

# ドライラン
python scripts/sync_scores.py sync --dry-run

# 本番同期
python scripts/sync_scores.py sync
```

Supabase の Table Editor で `scores` / `songs` / `sessions` にデータが入ることを確認できたら Phase 1 完了。

### 3. Next.js プロジェクト初期化（Phase 2）

詳細は `docs/nextjs-project-structure.md` 参照。

## ⚠️ 実装時の重要な注意点

### 🔴 パーサの属性名は推測ベース

`poc/karaoke-sync-poc/src/parser.py` の DAM XML 属性マッピング（例: `scoringDateTime`, `contentsName`, `vocalRangeHighest`）は**実機検証したレスポンスと想定される別名の組み合わせ**です。実機で動かして `parse_failed` ログが出たら、属性名を実 XML に合わせて修正する必要があります。

**デバッグ方法**:
```bash
python scripts/sync_scores.py show-xml <scoring_ai_id>
```

で生 XML を確認し、`parser.py` を修正。

### 🔴 cdmCardNo の保管方針

PoC では `.env` 直書きですが、**本番では必ず Supabase Vault に保存**すること。`sql/schema.sql` に `set_my_cdm_card_no()` / `get_cdm_card_no_for()` 関数を用意済みです。

- ユーザー登録時: クライアントから `set_my_cdm_card_no(card)` を RPC 経由で呼び出し
- Cron 同期時: Edge Function (service_role) から `get_cdm_card_no_for(user_id)` で復号取得

### 🔴 DAM API は非公式

- 認証なし、レート制限不明 → 現状は 0.5 秒/リクエストで throttle 済み
- スキーマ変更リスクあり → `scores.raw_xml` に永続保存しているので後から再パース可能
- サブドメイン変更の前例あり（デンモクmini API が 2025 年に別ドメインへ移行）

## 🎨 UI 実装の進め方

### Claude Design との連携

Claude Design で作成済みのプロトタイプ 3 画面があります（`prototypes/` フォルダ）。これらは**ビジュアルリファレンス**として扱い、実装時は `docs/karaoke-app-design-spec.md` の仕様書を真実の情報源にしてください。

**Claude Design の Hand off 機能**を使う場合は `docs/claude-design-integration.md` を参照。デザインと実装を一貫させるために推奨される手順が書いてあります。

### 優先順位

1. **画面2 レパートリー一覧** - アプリの顔
2. **画面3 レパ詳細** - データ表示の基盤
3. **画面1 ダッシュボード** - ヒーロー画面
4. **画面5 採点履歴一覧** - 履歴閲覧
5. **画面4 曲追加モーダル** - レパ追加の導線
6. **画面8 セトリ一覧** - MVP 後半
7. **画面9 セトリ編集** - MVP 後半

## 📊 データフロー概要

```
[DAM API]
    ↓ (HTTPS, XML)
[Edge Function or Vercel Cron]
    ↓ (parse, sort, group)
[Supabase Postgres]
    │
    ├── songs          (共有カタログ)
    ├── sessions       (セッション単位の集約)
    ├── scores         (採点レコード、永久保存)
    ├── repertoire     (ユーザーのレパ)
    ├── setlists       (セトリ)
    └── score_pitch_intervals (24区間ピッチ)
         ↓
[Next.js App (Vercel)]
    ↓ (Server Components + Supabase Client)
[User Browser (Mobile / Desktop)]
```

## 🧪 動作確認観点

Phase 2 以降の実装中、各フェーズで以下を確認:

- [ ] Supabase Auth でログインできる
- [ ] レパ一覧で自分のデータが表示される
- [ ] レパ詳細でレーダーチャートと音域が表示される
- [ ] 採点履歴がセッション単位でグルーピングされる
- [ ] Cron 同期が毎日動く（Vercel Cron もしくは GitHub Actions）
- [ ] 200 件を超えた過去データが DAM から消えても DB に残り続ける
- [ ] RLS で他人のデータが見えないことを確認（テストユーザー 2 人作って検証）

## 🚧 MVP スコープ外（明示的に外す）

- 音源解析による音域推定（将来）
- 複数カラオケ機種対応（JOYSOUND 等）
- ソーシャル機能（フォロー、公開プロフィール等）
- 課金
- モバイルネイティブアプリ

## 🔗 参考リンク

- DAM API 実機検証メモ: このパッケージには含まれないが、PoC コード (`src/parser.py`, `src/dam_client.py`) のコメントに埋め込み済み
- 初期仕様書: `docs/karaoke-app-design-spec.md`
- Claude Design プロトタイプ: `prototypes/` または Hand off URL（ユーザー所有）

## ❓ 不明点が出たら

ドキュメントで解決しないことがあれば:
1. コメントで仮定を明示して進める（「XXXと仮定して実装した」）
2. ユーザーに確認（「XXX の場合どうする？」）
3. 後で見返せるよう `TODO:` コメントを残す

**ユーザーの嗜好**（これは単一ユーザー向けアプリなので重要）:
- 結論を先に言う、前置きは不要
- 初心者向け基礎説明は省略してよい（実務レベル前提）
- 技術的な誤りには遠慮なく指摘
- コード内コメントは英語、API 仕様も英語、それ以外は日本語
