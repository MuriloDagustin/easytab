import { baseMsOf, type RhythmAnnotations } from './rhythm'

export type NoteUnit = 'quarter' | 'eighth' | 'sixteenth'

export interface Meter {
  /** Andamento em semínimas por minuto; null = automático. */
  bpm: number | null
  /** Tempos por compasso (2/4, 3/4, 4/4). */
  beats: 2 | 3 | 4
  /** Quanto vale uma nota "normal" da tab. */
  unit: NoteUnit
}

export const DEFAULT_METER: Meter = { bpm: null, beats: 4, unit: 'quarter' }

export const UNIT_QUARTERS: Record<NoteUnit, number> = { quarter: 1, eighth: 0.5, sixteenth: 0.25 }
export const UNIT_LABELS: Record<NoteUnit, string> = { quarter: 'semínima', eighth: 'colcheia', sixteenth: 'semicolcheia' }

export const MIN_BPM = 30
export const MAX_BPM = 260

/** Duração da nota normal em ms a 1×: pelo andamento escolhido, senão pelo ritmo gravado. */
export function unitMs(meter: Meter, rhythm: RhythmAnnotations): number {
  if (meter.bpm) return (60000 / meter.bpm) * UNIT_QUARTERS[meter.unit]
  return baseMsOf(rhythm)
}

export function beatMs(meter: Meter, rhythm: RhythmAnnotations): number {
  return unitMs(meter, rhythm) / UNIT_QUARTERS[meter.unit]
}

export function effectiveBpm(meter: Meter, rhythm: RhythmAnnotations): number {
  return Math.round(60000 / beatMs(meter, rhythm))
}

export function clampBpm(bpm: number): number {
  return Math.round(Math.min(MAX_BPM, Math.max(MIN_BPM, bpm)))
}

/** Andamento a partir de toques no tempo (mediana dos intervalos). */
export function bpmFromTaps(taps: number[]): number | null {
  if (taps.length < 3) return null
  const intervals = taps.slice(1).map((t, i) => t - taps[i]).sort((a, b) => a - b)
  const median = intervals[Math.floor(intervals.length / 2)]
  return median > 0 ? clampBpm(60000 / median) : null
}
