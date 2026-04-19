---
id: P2-02
title: Tailwind デザイントークン
phase: 2
type: code
depends_on: [P2-01]
blocks: [P4-01, P4-02, P4-03, P4-04, P4-05, P4-06, P4-07]
agent: generator
estimated_minutes: 10
---

# P2-02: Tailwind デザイントークン

## Goal
仕様書のカラーパレット・タイポを Tailwind config と globals.css に反映する。

## Inputs
- `docs/karaoke-app-design-spec.md` の section 1 「デザインシステム」

## Steps
1. `karaoke-app/tailwind.config.ts` を編集:
   ```ts
   import type { Config } from 'tailwindcss'

   const config: Config = {
     content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
     darkMode: 'class',  // ダーク固定なので実質不要だが残しておく
     theme: {
       extend: {
         colors: {
           'bg-base':     '#0a0a14',
           'bg-surface':  '#13132a',
           'bg-elevated': '#1c1c3a',
           'neon-pink':   '#ff2a8a',
           'neon-cyan':   '#00e5ff',
           'neon-purple': '#a855f7',
           'neon-green':  '#00ff9d',
           'neon-amber':  '#ffb300',
         },
         boxShadow: {
           'glow-pink': '0 0 12px rgba(255, 42, 138, 0.6), 0 0 24px rgba(255, 42, 138, 0.3)',
           'glow-cyan': '0 0 12px rgba(0, 229, 255, 0.6)',
           'glow-pink-soft': '0 0 16px rgba(255, 42, 138, 0.4), inset 0 0 8px rgba(255, 42, 138, 0.1)',
         },
         fontFamily: {
           sans: ['Inter', 'system-ui', 'sans-serif'],
         },
         fontFeatureSettings: {
           tabular: '"tnum"',
         },
       },
     },
     plugins: [],
   }
   export default config
   ```

2. `karaoke-app/app/globals.css` を編集:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;

   :root {
     color-scheme: dark;
   }

   body {
     background: #0a0a14;
     color: #ffffff;
     font-family: Inter, system-ui, sans-serif;
   }

   /* Tabular numbers for score displays */
   .tabular-nums {
     font-feature-settings: "tnum";
   }

   /* Neon text glow utilities */
   .neon-text-pink {
     text-shadow: 0 0 12px rgba(255, 42, 138, 0.6), 0 0 24px rgba(255, 42, 138, 0.3);
   }
   .neon-text-cyan {
     text-shadow: 0 0 12px rgba(0, 229, 255, 0.6);
   }
   ```

3. 動作確認:
   ```bash
   pnpm dev
   # app/page.tsx に `<div className="bg-bg-base text-neon-pink">Test</div>` を一時追加して色が出るか確認
   ```

## Outputs
- `tailwind.config.ts` にトークン定義
- `app/globals.css` にグローバルスタイル
- ダーク背景 + ネオンカラーが効く

## Evaluation
```yaml
MUST:
  - [FILE] tailwind.config.ts に neon-pink, neon-cyan 等が定義されている
  - [CMD] pnpm build 終了コード 0
  - [FILE] body の背景色が #0a0a14
```

## Failure Modes
- **Tailwind v4 への移行で config 形式が変わった場合**: `@theme` ディレクティブ形式に変更。v3 なら上記の形式で OK
