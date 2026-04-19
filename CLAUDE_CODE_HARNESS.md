# Claude Code Harness (CLAUDE_CODE_HARNESS.md)

Harness Engineering 方式で本プロジェクトを自律実装する方法。Planner → Generator → Evaluator の multi-agent loop を回すための実行設定をまとめる。

## ハーネス構成の選択肢

### Option A: Claude Code の built-in auto モード (最速で始められる)

Claude Code には auto-continue モードがあり、最小限の設定で multi-step タスクを自律実行できる。

**セットアップ**:
```bash
# ~/.claude/config.json (参考、Claude Code の設定方法は公式Doc参照)
{
  "allowed_tools": ["bash", "edit", "view", "create_file"],
  "auto_continue": true,
  "max_iterations_per_task": 10
}
```

**使い方**:
1. karaoke-handoff/ ディレクトリで Claude Code を起動
2. 以下のプロンプトを投げる:

```
Read HANDOFF.md, AGENT_TASKS/README.md, EVALUATION.md, and EVALUATOR_PROMPTS.md first.

Then execute tasks in AGENT_TASKS/ in dependency order starting from P1-02
(skip P1-01 and P1-03 as they require human actions — I'll notify you when done).

For each task:
1. Read the task file
2. Execute the Steps section
3. Verify against the Evaluation section
4. If failed, retry up to 3 times with different approaches
5. If still failed or blocked by a human checkpoint, pause and report

Maintain a STATE.json file tracking task progress.

After each task completes, summarize what was done in 1-2 sentences.
```

3. 人間チェックポイント (HC-*) が必要なタイミングで Claude Code が一時停止
4. 人間が手動作業後「HC-XX-XX complete. Please proceed.」と応答
5. 継続して次タスクに進む

**pros**: シンプル、追加の infra 不要
**cons**: Claude Code のトークン消費大、複雑な evaluation loop は実現しづらい

### Option B: カスタム Multi-Agent Orchestrator

より本格的な Planner/Generator/Evaluator 分離。

**構成**:
```
Planner (Opus) → Generator (Sonnet) → Evaluator (Opus)
                       ↓                      ↓
                 [Write code]            [Run tests]
                                              ↓
                                    pass ──┴── fail
                                     ↓          ↓
                                Mark done   Retry with feedback
```

**実装選択肢**:
1. **LangGraph (Python)**: 最も成熟、state machine が明確
2. **Claude Agent SDK (TS)**: Anthropic 公式、native
3. **自前スクリプト**: bash + jq で可能、簡素

#### 最小実装例 (自前スクリプト)

`harness/run.sh`:
```bash
#!/bin/bash
set -e

STATE_FILE="STATE.json"

# Initialize if not exists
if [ ! -f "$STATE_FILE" ]; then
  jq -n '{current_task: "P1-02", task_status: {}, human_escalations: []}' > "$STATE_FILE"
fi

while true; do
  TASK=$(jq -r '.current_task' "$STATE_FILE")
  if [ "$TASK" = "null" ] || [ -z "$TASK" ]; then
    echo "All tasks done."
    break
  fi

  # Check if task is human-only
  TASK_FILE=$(ls AGENT_TASKS/${TASK}-*.md 2>/dev/null | head -1)
  if grep -q "agent: human" "$TASK_FILE" 2>/dev/null; then
    echo "Human task $TASK required. Pausing."
    jq ".human_escalations += [\"$TASK\"]" "$STATE_FILE" > tmp && mv tmp "$STATE_FILE"
    break
  fi

  # Generator phase
  echo "=== Running $TASK (Generator) ==="
  claude -p "$(cat generator_prompt.md) \n\nTask: $TASK_FILE" > generator_output.md

  # Evaluator phase
  echo "=== Evaluating $TASK ==="
  RESULT=$(claude -p "$(cat EVALUATOR_PROMPTS.md) \n\nEvaluate task $TASK based on the output in generator_output.md" | jq -r '.result')

  if [ "$RESULT" = "PASS" ]; then
    echo "$TASK passed."
    jq ".task_status[\"$TASK\"] = {status: \"done\"}" "$STATE_FILE" > tmp && mv tmp "$STATE_FILE"
    NEXT=$(python harness/next_task.py "$STATE_FILE")
    jq ".current_task = \"$NEXT\"" "$STATE_FILE" > tmp && mv tmp "$STATE_FILE"
  else
    ATTEMPTS=$(jq ".task_status[\"$TASK\"].attempts // 0" "$STATE_FILE")
    if [ "$ATTEMPTS" -ge 3 ]; then
      echo "$TASK failed 3 times. Escalating to human."
      jq ".human_escalations += [\"$TASK\"]" "$STATE_FILE" > tmp && mv tmp "$STATE_FILE"
      break
    fi
    echo "$TASK failed. Retrying (attempt $((ATTEMPTS + 1)))"
    jq ".task_status[\"$TASK\"].attempts = ($ATTEMPTS + 1)" "$STATE_FILE" > tmp && mv tmp "$STATE_FILE"
  fi
done
```

**pros**: 完全にカスタマイズ可能、evaluator の厳密な判定が書ける
**cons**: 実装工数がかかる

### Option C: Hybrid (推奨)

- **Phase 1 (PoC)**: Python で動くので手動実行が簡単、Option A で十分
- **Phase 2-3 (インフラ)**: 依存関係が複雑、Option B が力を発揮
- **Phase 4 (UI)**: Claude Design Hand off を使うので、Option A で Hand off URL を渡す方が楽
- **Phase 5 (デプロイ)**: Human 介入多い、auto loop は無意味

## 各 Phase の推奨ハーネス戦略

### Phase 1: PoC 動作確認 (Option A + Human)

```
Human: Do P1-01 (Supabase setup). Notify when done with keys.
Claude Code: Run P1-02 → verify schema. Report result.
Human: Do P1-03 (.env setup). Notify.
Claude Code: Run P1-04 dry-run. If parse_failed, auto-loop P1-04 → P1-05 up to 3 times.
Claude Code: Run P1-06, P1-07.
Claude Code: Report Phase 1 complete.
```

### Phase 2: Next.js 初期化 (Option A)

```
Claude Code:
- P2-01 (init project)
- P2-02 (tokens) ← can parallel with P2-03
- P2-03 (supabase client)
- P2-04 (middleware) depends on P2-03
- P2-05, P2-06 (can parallel)
- Verify build & type-check
```

### Phase 3: データ取得層 (Option A + 並列化)

P3-02 から P3-06 は独立しているため並列実行可:

```
Claude Code:
- P3-01 (type gen) first
- Then parallel: P3-02, P3-03, P3-04, P3-05, P3-06
- Then P3-07 (verification)
```

### Phase 4: UI 実装 (Option A + Claude Design Hand off)

```
For each screen (P4-01 to P4-07):
1. Human: Generate Claude Design Hand off URL for the screen
2. Claude Code: Use the URL + task file as input
3. Claude Code: Implement, build, test
4. Evaluator: Visual + functional check
5. Retry loop up to 3 times
```

UI 実装は、pixel diff が人間判断になることが多いので、**1 画面ずつ進めて都度確認**する方が安全。

### Phase 5: デプロイ (Human-heavy)

Human が主導、Claude Code は script 生成と文書化を支援。

## Task State 管理

`STATE.json` の構造:

```json
{
  "current_phase": 1,
  "current_task": "P1-04",
  "task_status": {
    "P1-01": {
      "status": "done",
      "completed_at": "2026-04-19T03:00:00Z",
      "completed_by": "human"
    },
    "P1-02": {
      "status": "done",
      "completed_at": "2026-04-19T03:05:00Z",
      "completed_by": "agent",
      "attempts": 1
    },
    "P1-04": {
      "status": "failed",
      "attempts": 2,
      "last_error": "parse_failed for scoring_ai_id=EXAMPLE",
      "last_attempt_at": "2026-04-19T03:10:00Z"
    }
  },
  "human_escalations": [
    {
      "task": "P1-04",
      "reason": "3 consecutive parse_failed",
      "escalated_at": "2026-04-19T03:15:00Z"
    }
  ],
  "started_at": "2026-04-19T02:55:00Z"
}
```

## Planner Agent の役割 (Option B/C 用)

Planner は以下を担当:
1. `STATE.json` を読む
2. `AGENT_TASKS/README.md` の依存グラフを参照
3. 実行可能なタスク(depends_on が全て done)を特定
4. 並列実行可能ならまとめて Generator に渡す
5. 人間タスクに当たったら pause

Planner プロンプト例:
```
You are the Planner Agent. Read STATE.json and AGENT_TASKS/README.md.

Current state:
{state_json_content}

Determine the next task(s) to execute:
1. Filter out tasks already "done"
2. Filter out tasks with incomplete dependencies
3. Among remaining tasks, select the earliest phase first
4. If task type is "human", pause and return escalation
5. If multiple tasks in same phase have no inter-dependency, return them all for parallel execution

Return JSON:
{
  "next_tasks": ["P1-02", ...],
  "parallel_group": true | false,
  "pause_for_human": "P1-01" | null,
  "reason": "..."
}
```

## Generator Agent のプロンプトテンプレート

```
You are the Generator Agent. Read the task file and execute.

Task: {task_file_content}

Project context:
- Read HANDOFF.md for project overview
- Follow docs/nextjs-project-structure.md for Next.js layout
- Use types from types/domain.ts
- Never modify sql/schema.sql
- Never hardcode secrets

Steps:
1. Read all "Inputs" referenced in the task file
2. Implement the "Steps" section precisely
3. Produce the "Outputs" listed
4. After completion, run the verification commands in "Evaluation"
5. Self-report any failures

If you face an issue not covered in "Failure Modes", describe it and pause.
Do not invent workarounds that deviate from the project design.
```

## Claude Design との連携ハーネス

Claude Design Hand off URL を使う場合、プロンプトは以下の形式:

```
Implement UI task {P4-XX} using the following design handoff:

Hand off URL: {URL from Claude Design Export}
Implement: {filename e.g. "Repertoire List (Mobile).html"}

Additional context:
- Task spec: AGENT_TASKS/{P4-XX}-*.md
- Project conventions: docs/nextjs-project-structure.md
- Data source: lib/queries/{module}.ts
- Actions: lib/actions/{module}.ts
- Use existing UI components from components/ui/

Implement as:
- Next.js 15 App Router
- Server Component as the base, Client Component only when needed
- Use Tailwind tokens (neon-pink, bg-surface, etc.), NO hardcoded hex
- Connect to real data (no mock data in final output)
- Handle loading, error, empty states
```

## トークン消費の目安

| Phase | 推定トークン消費 (Claude Opus 4.7 相当) |
|---|---|
| Phase 1 (PoC) | 5k-20k (ほぼ検証のみ) |
| Phase 2 (Init) | 30k-60k |
| Phase 3 (データ層) | 50k-100k |
| Phase 4 (UI) | 200k-500k (Claude Design Hand off を使えば減る) |
| Phase 5 (Deploy) | 20k-40k |
| **合計** | **300k-720k** |

Pro プランの週次トークン上限と Claude Design の別枠を考慮して、**数週間に分けて実行**するのが現実的。

## Escalation 判定ルール (まとめ)

Agent が自動で人間へ戻すべき場合:

1. `HC-*` で 🔴 Blocking のチェックポイント
2. 同一タスク 3 回連続失敗
3. 1 Phase で累計 20 回以上の再生成
4. 外部サービスエラー 5 回連続
5. schema.sql の変更が必要と判断した場合
6. 新依存関係の追加 (pnpm add …)
7. 破壊的 DB 操作 (DROP, TRUNCATE)
8. pixel diff > 30%
9. RLS 違反が修正後も継続

Escalation 発生時は `STATE.json` の `human_escalations` に追記し、`current_task` を null にして Harness を pause する。

## 失敗からの復旧

`STATE.json` の特定タスクの status を "queued" に手動で戻せば、再実行できる:

```bash
jq '.task_status["P1-04"] = {status: "queued", attempts: 0}' STATE.json > tmp && mv tmp STATE.json
jq '.current_task = "P1-04"' STATE.json > tmp && mv tmp STATE.json
```

または一括リセット:
```bash
jq '.task_status = {} | .current_task = "P1-02" | .human_escalations = []' STATE.json > tmp && mv tmp STATE.json
```

## 推奨のスタート手順

初めて Harness を回す場合:

1. **まず Phase 1 だけ Option A で試す** (最もリスクが低い、データが流れるまで検証)
2. Phase 1 が完走したら、**Phase 2-3 を一気に Option A で流す** (コード生成のみ)
3. Phase 4 は**画面 1 つずつ**、Claude Design Hand off を人間が手動生成して Claude Code に渡す
4. Phase 5 は **Claude Code を使わず、人間が手動**
