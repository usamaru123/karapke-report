# AGENT_TASKS

原子タスク集。各タスクは **Planner Agent が選択 → Generator Agent が実装 → Evaluator Agent が判定** の 1 周回に対応する。

## 共通タスクスキーマ

全タスクは以下のセクションを持つ:

```yaml
id:         <P1-01 など>
title:      <人間が読むタイトル>
phase:      <1-5>
type:       code | config | human | verify
depends_on: [<他タスクID>, ...]
blocks:     [<このタスクが解除する後続タスクID>, ...]
agent:      generator | evaluator | human
estimated_minutes: <完了目安>
```

そして以下の本文:

1. **Goal** - 何を達成するか (1-2 文)
2. **Inputs** - 参照すべきドキュメント、前提情報
3. **Steps** - 具体的な手順 (Generator Agent はこれに従う)
4. **Outputs** - 生成されるファイル、DB 変更、その他の副作用
5. **Evaluation** - EVALUATION.md の該当項目を参照
6. **Failure Modes** - よくある失敗と対処
7. **Escalation** - 人間に戻すべき条件

---

## Phase 1: データ基盤 (7 tasks)

| ID | Title | Agent | Depends |
|---|---|---|---|
| P1-01 | Supabase プロジェクト作成 | human | - |
| P1-02 | Schema 適用 | generator | P1-01 |
| P1-03 | PoC .env 設定 | human | P1-01 |
| P1-04 | PoC Dry-Run | evaluator | P1-02, P1-03 |
| P1-05 | Parser 修正ループ | generator | P1-04 (if parse_failed) |
| P1-06 | PoC 本番同期 | evaluator | P1-04 (pass) |
| P1-07 | 冪等性検証 | evaluator | P1-06 |

## Phase 2: Next.js 初期化 (6 tasks)

| ID | Title | Agent | Depends |
|---|---|---|---|
| P2-01 | Next.js プロジェクト初期化 | generator | - |
| P2-02 | Tailwind デザイントークン | generator | P2-01 |
| P2-03 | Supabase クライアント | generator | P2-01 |
| P2-04 | 認証 Middleware | generator | P2-03 |
| P2-05 | ログイン画面 | generator | P2-04 |
| P2-06 | ナビゲーション骨格 | generator | P2-04 |

## Phase 3: データ取得層 (7 tasks)

| ID | Title | Agent | Depends |
|---|---|---|---|
| P3-01 | Supabase 型生成 | generator | P1-02, P2-03 |
| P3-02 | Queries: Repertoire | generator | P3-01 |
| P3-03 | Queries: Dashboard | generator | P3-01 |
| P3-04 | Queries: History | generator | P3-01 |
| P3-05 | Queries: Setlists | generator | P3-01 |
| P3-06 | Server Actions (CRUD) | generator | P3-01 |
| P3-07 | RLS 検証 | evaluator | P3-02 ～ P3-06 |

## Phase 4: 画面実装 (7 tasks)

| ID | Title | Agent | Depends | Claude Design |
|---|---|---|---|---|
| P4-01 | 画面2 レパ一覧 | generator | P3-02 | Hand off 推奨 |
| P4-02 | 画面3 レパ詳細 | generator | P3-02, P4-01 | Hand off 推奨 |
| P4-03 | 画面1 ダッシュボード | generator | P3-03 | Hand off 推奨 |
| P4-04 | 画面5 採点履歴 | generator | P3-04 | 仕様書ベース |
| P4-05 | 画面4 曲追加モーダル | generator | P3-06, P4-01 | 仕様書ベース |
| P4-06 | 画面8 セトリ一覧 | generator | P3-05 | 仕様書ベース |
| P4-07 | 画面9 セトリ編集 | generator | P3-05, P3-06, P4-06 | 仕様書ベース |

## Phase 5: 同期 + デプロイ (4 tasks)

| ID | Title | Agent | Depends |
|---|---|---|---|
| P5-01 | Edge Function 実装 | generator | P1-06 |
| P5-02 | Vault 連携 | generator | P5-01 |
| P5-03 | Cron 設定 | generator | P5-02 |
| P5-04 | Vercel デプロイ | human + generator | P5-03, P4-* |

---

## 依存関係グラフ (ASCII)

```
P1-01 (human) ──┬──> P1-02 ──> P1-04 ──> (P1-05)* ──> P1-06 ──> P1-07
                │                                        │
                └──> P1-03 (human)                       │
                                                         │
P2-01 ──> P2-02                                          │
  │                                                      │
  └──> P2-03 ──> P2-04 ──┬──> P2-05                     │
                          └──> P2-06                     │
                                                         │
P3-01 ──┬──> P3-02 ──> P4-01 ──> P4-02 ──> P4-05       │
        ├──> P3-03 ──> P4-03                             │
        ├──> P3-04 ──> P4-04                             │
        ├──> P3-05 ──> P4-06 ──> P4-07                  │
        └──> P3-06 ──> P3-07                            │
                                                         │
P5-01 <──────────────────────────────────────────────────┘
  ↓
P5-02 ──> P5-03 ──> P5-04 (human)
```

注: `P1-05` は `P1-04` が failed の場合のみ実行されるリカバリタスク。

---

## 実行順序の推奨

### 並列実行可能なフェーズ

- **Phase 1 (Sequential)**: データ基盤、順次実行必須
- **Phase 2 (Parallel)**: P2-01 完了後、残りは並列可能
- **Phase 3 (Parallel)**: P3-01 完了後、P3-02 ～ P3-06 は並列可能
- **Phase 4 (Sequential)**: 画面単位で順次が安全 (デザイン一貫性のため)
- **Phase 5 (Sequential)**: 同期機能の順次構築

### Critical Path

MVP 完成までの最長経路 (並列を最大活用した場合):

```
P1-01 (30min) → P1-02 (5min) → P1-04 (5min) → P1-06 (10min) → P1-07 (5min)
  ↓
P2-01 (5min) → P2-03 (10min) → P2-04 (10min)
  ↓
P3-01 (5min) → P3-02 (15min)
  ↓
P4-01 (30min) → P4-02 (45min)
  ↓
P5-01 (60min) → P5-02 (20min) → P5-03 (10min) → P5-04 (30min)
```

合計: 約 4-5 時間 (並列作業 + Agent が即座に動いた場合の理論値)
現実的には: 10-15 時間 (失敗リトライ、人間チェックポイント含む)

---

## Agent が参照すべき共通ドキュメント

各タスクで明示的に Inputs に書かなくても、Agent は以下を常時参照可能とする:

- `HANDOFF.md` - プロジェクト概要
- `docs/karaoke-app-design-spec.md` - UI 仕様
- `docs/data-model.md` - データモデル
- `docs/implementation-roadmap.md` - Phase 計画
- `docs/nextjs-project-structure.md` - 構造想定
- `sql/schema.sql` - DDL (読み取り専用)
- `EVALUATION.md` - 評価基準
- `HUMAN_CHECKPOINTS.md` - 人間介入ポイント
- `EVALUATOR_PROMPTS.md` - 評価観点 (Evaluator のみ)

---

## ステータストラッキング

実行中のタスク状態は `STATE.json` に記録 (自動生成):

```json
{
  "current_phase": 1,
  "current_task": "P1-04",
  "task_status": {
    "P1-01": { "status": "done", "completed_at": "2026-04-19T03:00:00Z" },
    "P1-02": { "status": "done", "completed_at": "2026-04-19T03:05:00Z" },
    "P1-03": { "status": "done", "completed_at": "2026-04-19T03:08:00Z" },
    "P1-04": { "status": "failed", "attempts": 2, "last_error": "parse_failed for scoring_ai_id=..." },
    "P1-05": { "status": "queued" }
  },
  "human_escalations": []
}
```
