# Claude Design との連携

UI 実装時に Claude Design の成果物を効果的に活用する方法。

## Claude Design Hand off 機能とは

Claude Design で作成したデザインを、Claude Code に直接「実装して」と渡せる公式機能。2026 年 4 月 17 日にローンチ。

### 仕組み

Claude Design の Export メニューから「Hand off to Claude Code」を選ぶと、以下が生成される:

```
Fetch this design file, read its readme, and implement the relevant aspects of the design.
https://api.anthropic.com/v1/design/h/<UNIQUE_ID>?open_file=<FILENAME>
Implement: <FILENAME>
```

この URL には:
- 全画面の HTML バンドル
- `README.md`（デザインシステムのトークン、コンポーネント境界、実装意図）
- Claude Design のチャット履歴

が含まれており、Claude Code がバンドルを fetch → README を読む → 指定画面を実装、という流れで動く。

## 推奨ワークフロー

### Option A: Hand off を使う（推奨）

```
1. Claude Design でデザインが固まった状態
2. Claude Design 右上の「Export」→「Hand off to Claude Code」
3. 生成された URL + 指示文をコピー
4. Claude Code のセッションで貼り付け
5. Claude Code が:
   - URL から HTML バンドルを取得
   - README を読み、デザイントークンを抽出
   - 指定ファイル（例: "History (Mobile).html"）を Next.js コンポーネントに変換
```

このとき Claude Code には追加で以下を伝えると精度が上がる:

```
参考情報:
- これは karaoke-handoff パッケージの一部です
- UI 仕様書: docs/karaoke-app-design-spec.md
- データ取得: lib/queries/*.ts を使う
- モックデータではなく、Supabase からのデータで動かしてください
- Server Components を基本とし、状態が必要な部分だけ Client Components に
```

### Option B: Hand off を使わない（手動変換）

Claude Design にアクセスできない・URL が期限切れなどの場合:

```
1. Claude Design からスクショを取る（画面ごとに）
2. そのスクショと UI 仕様書をセットで Claude Code に渡す
3. 「この画像と仕様書を元に Next.js コンポーネントを書いて」と指示
```

精度は Option A に劣るが、十分実装可能。

## 画面別のコツ

### 画面2 レパートリー一覧

```
[Hand off URL here]
Implement: Repertoire List (Mobile).html

追加指示:
- Server Component として実装
- `lib/queries/repertoire.ts` の getRepertoire() を呼ぶ
- フィルタチップの状態は URL searchParams で管理（例: ?filter=over90）
- 点数の色分け: 90+=neon-pink(glow), 80-90=white, <80=muted
- FAB は Client Component に分離（モーダル開閉状態を持つため）
```

### 画面3 レパ詳細

```
[Hand off URL]
Implement: Repertoire Detail (Mobile).html

追加指示:
- [id] 動的ルート
- レーダーチャートは recharts の RadarChart を使用
- 音域バーは独自コンポーネント VocalRangeBar を自作（MIDI note から C2-C6 に配置）
- 歌唱推移は recharts の LineChart
- 編集モードは Client Component に切り出し、form は react-hook-form
```

### 画面1 ダッシュボード

```
[Hand off URL]
Implement: Dashboard (Mobile).html

追加指示:
- ヒーローカードの「自己ベスト更新」ラベルは条件付き表示
  （今月の最高点 > 先月以前の最高点 のときのみ出す）
- KPI タイルは各々リンク遷移:
  - レパ曲数 → /repertoire
  - 総歌唱回数 → /history
  - 平均点 → /history
  - 90+達成曲 → /repertoire?filter=over90
- 「取り込む」ボタンは Server Action 経由で Edge Function を呼ぶ
```

## デザインシステムの同期

Claude Design で定義したデザイントークンと、Next.js 側の `tailwind.config.ts` を一致させる。

**推奨**: Claude Design の README にある CSS 変数定義を、そのまま tailwind.config.ts にマッピング:

```js
// Claude Design が出力する README.md 内の例
:root {
  --color-bg-base: #0a0a14;
  --color-neon-pink: #ff2a8a;
  /* ... */
}

// tailwind.config.ts に反映
colors: {
  'bg-base': 'var(--color-bg-base)',
  'neon-pink': 'var(--color-neon-pink)',
}
```

## Claude Design でのトークン消費に注意

Claude Design は**週次の別枠トークン制限**あり。既に 3 画面（レパ一覧、ダッシュボード、レパ詳細）を生成済みなので、残り画面を作るときはトークン残量を確認。

上限に当たった場合:
- **Option A**: Pro プランで追加トークン購入
- **Option B**: 残り画面は Claude Code に UI 仕様書だけを渡して手動実装
- **Option C**: スクショをもとに Claude Code に作らせる（Option B と近い）

## 実装時のチェックリスト

各画面実装後に確認:

- [ ] Claude Design のビジュアルと視覚的に 80% 以上一致している
- [ ] モバイルとPC の両方で崩れない
- [ ] ダークモード前提で、白地の要素が残っていない
- [ ] 実データが流れる（モックデータのハードコードが残っていない）
- [ ] TypeScript の型エラーなし
- [ ] Server / Client Components の使い分けが妥当
- [ ] RLS が効いている（別ユーザーで検証）
- [ ] ローディング中・エラー・空状態の3パターンが設計されている

## 参考リンク

- Claude Design 公式: https://claude.ai/design
- Anthropic 公式ガイド: https://claude.com/resources/tutorials/using-claude-design-for-prototypes-and-ux
