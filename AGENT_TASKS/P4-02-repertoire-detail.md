---
id: P4-02
title: 画面3 レパートリー詳細
phase: 4
type: code
depends_on: [P3-02, P4-01]
blocks: []
agent: generator
estimated_minutes: 60
claude_design_handoff: recommended
---

# P4-02: 画面3 レパートリー詳細

## Goal
`/repertoire/[id]` ルートを実装。レーダーチャート、音域バー、歌唱推移を含む最も情報量の多い画面。

## Inputs
- `docs/karaoke-app-design-spec.md` の画面3 定義
- `prototypes/03-repertoire-detail.png` (Claude Design 出力、音域バーのデザインが秀逸)
- `lib/queries/repertoire.ts` の `getRepertoireDetail`
- `lib/actions/repertoire.ts` の `updateRepertoireMeta`, `removeFromRepertoire`

## Steps

1. `app/(app)/repertoire/[id]/page.tsx` (Server Component):
   ```tsx
   import { getRepertoireDetail } from '@/lib/queries/repertoire'
   import { notFound } from 'next/navigation'

   export default async function RepertoireDetailPage({
     params,
   }: {
     params: Promise<{ id: string }>
   }) {
     const { id } = await params
     try {
       const detail = await getRepertoireDetail(id)
       return <RepertoireDetailView detail={detail} />
     } catch {
       notFound()
     }
   }
   ```

2. コンポーネント群:
   - `RepertoireDetailView` (Server) - 全体レイアウト
   - `ScoreSummaryCard` - 最高/直近/平均の3カラム
   - `RadarChart` (Client, recharts) - 5項目
   - `VocalRangeBar` - 鍵盤風の音域表示 ⭐
   - `MetaInfoPanel` (Client) - キー/自信度/タグ/メモ表示・編集切替
   - `ScoreHistoryChart` (Client, recharts) - 折れ線グラフ
   - `DetailActions` - 履歴全部見る/削除ボタン

3. 音域バーの実装 (`VocalRangeBar`):
   ```tsx
   // MIDI note -> 音名・相対位置の変換
   import { midiToNoteName, midiToPercent } from '@/lib/midi'

   export function VocalRangeBar({
     songLow, songHigh,
     mineLow, mineHigh,
   }: { songLow: number; songHigh: number; mineLow?: number; mineHigh?: number }) {
     // C2 (MIDI 36) ~ C6 (MIDI 84) のレンジに配置
     const MIN = 36, MAX = 84
     const range = MAX - MIN
     return (
       <div className="space-y-4">
         {/* 曲の音域 */}
         <div className="relative h-8 bg-bg-surface rounded">
           {/* 鍵盤風のベースライン */}
           <KeyboardBaseline />
           {/* 紫グラデーションバー */}
           <div
             className="absolute top-0 h-full bg-gradient-to-r from-neon-purple to-neon-pink opacity-80 rounded"
             style={{
               left: `${((songLow - MIN) / range) * 100}%`,
               width: `${((songHigh - songLow) / range) * 100}%`,
             }}
           />
           <div className="absolute -top-5 text-xs text-white/80" style={{ right: 4 }}>
             {midiToNoteName(songLow)} 〜 {midiToNoteName(songHigh)}
           </div>
         </div>

         {/* 自分の声域 */}
         {mineLow && mineHigh && (
           <div className="relative h-8 bg-bg-surface rounded">
             <KeyboardBaseline />
             <div
               className="absolute top-0 h-full bg-neon-cyan opacity-70 rounded"
               style={{
                 left: `${((mineLow - MIN) / range) * 100}%`,
                 width: `${((mineHigh - mineLow) / range) * 100}%`,
               }}
             />
             <div className="absolute -top-5 text-xs text-white/80" style={{ right: 4 }}>
               {midiToNoteName(mineLow)} 〜 {midiToNoteName(mineHigh)}
             </div>
           </div>
         )}

         {/* 音名ラベル */}
         <div className="flex justify-between text-xs text-white/40 px-1">
           {['C2','C3','C4','C5','C6'].map(n => <span key={n}>{n}</span>)}
         </div>
       </div>
     )
   }
   ```

4. レーダーチャート (recharts):
   ```tsx
   'use client'
   import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'

   export function ScoreRadarChart({ score }: { score: Score }) {
     const data = [
       { subject: '音程', value: score.pitch_score ?? 0 },
       { subject: '安定性', value: score.stability_score ?? 0 },
       { subject: '表現力', value: score.expression_score ?? 0 },
       { subject: 'ビブラート&ロングトーン', value: score.vibrato_longtone_score ?? 0 },
       { subject: 'リズム', value: score.rhythm_score ?? 0 },
     ]
     return (
       <ResponsiveContainer width="100%" height={280}>
         <RadarChart data={data}>
           <PolarGrid stroke="rgba(255,255,255,0.1)" />
           <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
           <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
           <Radar
             dataKey="value"
             stroke="#00e5ff"
             fill="#00e5ff"
             fillOpacity={0.3}
           />
         </RadarChart>
       </ResponsiveContainer>
     )
   }
   ```

5. `lib/midi.ts` を作成:
   ```ts
   const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

   export function midiToNoteName(midi: number): string {
     if (!Number.isFinite(midi)) return '?'
     const octave = Math.floor(midi / 12) - 1
     const name = NOTE_NAMES[midi % 12]
     return `${name}${octave}`
   }

   export function noteNameToMidi(name: string): number | null {
     // e.g. "C4" -> 60
     const match = /^([A-G])(#|b)?(-?\d+)$/.exec(name)
     if (!match) return null
     const base = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 }[match[1]]!
     const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0
     return (Number(match[3]) + 1) * 12 + base + accidental
   }

   export function midiToPercent(midi: number, min: number, max: number): number {
     return ((midi - min) / (max - min)) * 100
   }
   ```

## Outputs
- `app/(app)/repertoire/[id]/page.tsx`
- 上記コンポーネント群
- `lib/midi.ts`

## Evaluation
EVALUATION.md P4-02:
```yaml
MUST:
  - [HTTP] /repertoire/<実在ID> が 200、存在しない ID は 404
  - [VISUAL] 全セクション表示
  - [CMD] 音域が MIDI -> 音名で正しく変換 (例: 50 → D3)
  - [CMD] レーダーチャートが recharts で描画
SHOULD:
  - [CMD] 編集モード切替で meta 更新
```

## Failure Modes
- **recharts が動かない**: 'use client' 忘れ、SSR では描画されない
- **音域バーの位置がずれる**: MIDI 範囲 (MIN=36, MAX=84) の計算を再確認
- **データに vocal_range がない**: songs.vocal_range_* が NULL のケースは「未測定」表示にフォールバック
