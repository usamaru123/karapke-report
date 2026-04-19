const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

/**
 * Convert a MIDI note number to its note name (e.g. 50 → "D3", 60 → "C4").
 * Assumes MIDI 60 = middle C = C4 (standard convention).
 */
export function midiToNoteName(midi: number | null | undefined): string {
  if (midi === null || midi === undefined || !Number.isFinite(midi)) return "—";
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  return `${name}${octave}`;
}

/**
 * Map a MIDI note number to a percentage position within [min, max].
 * Returns a clamped 0..100 value (inclusive).
 */
export function midiToPercent(midi: number, min: number, max: number): number {
  if (max <= min) return 0;
  const pct = ((midi - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, pct));
}

// Standard piano range bounds the vocal range bar visualization.
// C2 (36) ~ C6 (84) covers typical karaoke vocal territory with headroom.
export const RANGE_BAR_MIN_MIDI = 36;
export const RANGE_BAR_MAX_MIDI = 84;
