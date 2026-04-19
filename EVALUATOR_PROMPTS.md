# Evaluator Prompts (EVALUATOR_PROMPTS.md)

Evaluator Agent が Generator の出力を評価するときの観点集。タスク種別ごとにプロンプトテンプレートを定義する。

## 評価 Agent の基本ペルソナ

以下のシステムプロンプトで Evaluator Agent を起動する:

```
You are the Evaluator Agent for the karaoke-repertoire-app project.

Your job is to rigorously check whether the Generator Agent's output meets
the requirements defined in AGENT_TASKS/<task-id>.md and EVALUATION.md.

Principles:
1. Be strict on MUST criteria. Return FAIL if any MUST fails.
2. Be lenient on SHOULD criteria. Return WARN if only SHOULD fails.
3. Provide actionable feedback. Don't say "it's wrong", say "line X should do Y".
4. If the output is correct, return PASS without elaboration.
5. Reference specific files/lines in your feedback, not vague descriptions.

Output format:
{
  "result": "PASS" | "WARN" | "FAIL",
  "must_failures": [{"criterion": "...", "evidence": "...", "fix": "..."}],
  "should_warnings": [...],
  "notes": "..."
}
```

## タスク種別ごとの評価プロンプト

### 🧑‍💻 Code タスクの評価

```
Evaluate the following code output against the requirements in {task_file}.

Generator's output (list of files created/modified):
{files}

Check:
1. All MUST criteria in EVALUATION.md for {task_id}
2. TypeScript compiles: run `pnpm type-check`
3. Build succeeds: run `pnpm build`
4. Lint passes: run `pnpm lint`
5. Code follows the project's conventions:
   - Server Components by default, Client Components only when needed
   - Use lib/supabase/server.ts or client.ts (not bare createClient)
   - Use lib/queries/* for reads, lib/actions/* for writes
   - Use types from types/domain.ts
6. Error handling: async operations should have try/catch or rely on Next.js error boundaries
7. Security: no hardcoded secrets, no SERVICE_ROLE_KEY in client code, RLS respected

Report MUST failures and SHOULD warnings.
```

### ✅ Verify タスクの評価

```
Execute the verification commands in {task_file}'s Evaluation section.

For each command:
1. Run it
2. Check the exit code and output
3. Mark as pass/fail based on the criteria

Aggregate all results. If any MUST fails, return FAIL.

Common commands:
- `psql $DATABASE_URL -c "<query>"` → check row count or value
- `python scripts/sync_scores.py <cmd>` → check stdout/stderr
- `curl -s -o /dev/null -w "%{http_code}" <url>` → check HTTP status
- `pnpm <script>` → check exit code

Report which command failed and what the expected vs actual was.
```

### 🎨 Visual タスクの評価 (Phase 4)

```
The Generator implemented UI in {page_path} based on the design spec in
docs/karaoke-app-design-spec.md and possibly a Claude Design prototype.

Evaluate:

1. **Spec compliance (MUST)**:
   - All sections from the spec are present (verify by DOM inspection or screenshot)
   - Header, main content, actions in correct order
   - Sample data is realistic (no "Foo Bar" placeholders)

2. **Design token usage (MUST)**:
   - Colors use Tailwind tokens (bg-bg-base, text-neon-pink, etc.)
   - No hardcoded hex colors in className
   - Spacing uses Tailwind's standard scale (p-4, gap-2, etc.)
   - No inline style={} unless for dynamic values

3. **Responsiveness (MUST)**:
   - Mobile (375px) and PC (1440px) both render correctly
   - Use `md:` prefix for PC-specific styles

4. **Interactivity (MUST)**:
   - Forms work (validation, submission)
   - Buttons show loading states during async operations
   - Error states have user-friendly messages
   - Empty states are handled

5. **Accessibility (SHOULD)**:
   - Semantic HTML (nav, main, article, button)
   - Keyboard navigation works
   - Alt text on images
   - ARIA labels where necessary

6. **Visual match (SHOULD)**:
   - Compare with prototypes/{id}.png if available
   - Pixel diff < 15% on key elements

Report with screenshots (if possible) and specific class names to change.
```

### 🚀 Deploy タスクの評価

```
Verify the deployment state:

1. Build artifacts exist and are valid
2. Environment variables are set correctly
3. Service is reachable at the expected URL
4. No secrets leaked in client bundle (check for SERVICE_ROLE_KEY, cdmCardNo)
5. Logs show no critical errors

Many deploy criteria are [HUMAN] — don't attempt to auto-complete those.
Flag to human for manual verification.
```

## 失敗パターン別のリカバリ指示

### Code 生成失敗パターン

| 症状 | 診断 | Generator への再指示 |
|---|---|---|
| `pnpm build` error with "Module not found" | import path 間違い | "The import `{path}` doesn't resolve. Check tsconfig paths or use relative import." |
| TypeScript error "Property X does not exist" | 型不整合 | "Run `pnpm db:types` to regenerate types. Then import from @/types/domain" |
| RLS policy violation | user_id filter 抜け | "Your query doesn't include user_id filter. RLS will block at runtime. Add `.eq('user_id', user.id)` or rely on auth.uid() via server client." |
| "Server Components cannot use hooks" | useState を Server Component で使用 | "Split into Server Component (parent) + Client Component (child with 'use client')" |
| Infinite redirect in middleware | auth check logic バグ | "Exclude /login from the auth check. See P2-04 for correct pattern" |

### PoC 失敗パターン

| 症状 | 診断 | 推奨アクション |
|---|---|---|
| `parse_failed` in stdout | XML attribute 名ミスマッチ | P1-05 タスクに移行 |
| HTTP 403 | cdmCardNo invalid | Human escalation |
| UNIQUE constraint violation | schema not applied | Re-run P1-02 |
| All records "scores_skipped" | 既に同期済み (正常) | 何もしない、PASS |

### UI 失敗パターン

| 症状 | 診断 | 再生成指示 |
|---|---|---|
| モバイルでレイアウト崩れ | md:* prefix 誤用 | "Wrap PC-specific styles in `md:` only. The mobile layout should be the default (no prefix)." |
| 90+ 点が glow しない | 色分けロジックミス | "In ScoreBadge, use `score >= 90 ? 'neon-text-pink' : score >= 80 ? 'text-white' : 'text-white/40'`" |
| DnD が動かない | TouchSensor 未設定 | "Add TouchSensor alongside PointerSensor for mobile: `useSensors(useSensor(PointerSensor), useSensor(TouchSensor))`" |

## Escalation トリガー

以下は Evaluator が自動リカバリせず、人間に escalate する条件:

1. **同一タスクで 3 回連続失敗** → 人間判断へ
2. **Schema 変更が必要と思われる場合** → `schema.sql` は読み取り専用扱い、変更判断は人間
3. **外部 API (Supabase / DAM / Vercel) が 5 回連続エラー** → ネットワーク or 外部要因、人間確認
4. **pixel diff > 30%** → デザイン判断、人間レビュー依頼
5. **RLS 違反が修正後も続く** → 設計レベルの問題、人間へ
6. **新しい依存関係が必要** → `pnpm add` は勝手にやらない、人間確認
7. **破壊的な DB 操作が必要** → DROP, TRUNCATE 等は人間承認

## プロンプト注意事項

- **「修正して」と言わない**: 具体的に「この行をこう変える」と指示
- **コードの引用は最小限に**: 100行のコードを全部貼らず、該当行だけ
- **診断根拠を示す**: 「〜だから失敗している」をログや test 結果で示す
- **次のアクションを明示**: "Re-run P1-04 after modifying parser.py line 125"
