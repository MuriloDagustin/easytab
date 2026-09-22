export type Duration = 'short' | 'normal' | 'long'

export const DURATION_MULTIPLIER: Record<Duration, number> = { short: 0.5, normal: 1, long: 2 }
export const DURATION_LABELS: Record<Duration, string> = { short: 'Curta', normal: 'Normal', long: 'Longa' }

export interface RecordedRhythm {
  /** Duração de cada evento em unidades, medida tocando junto com a música. */
  units: Record<number, number>
  /** Duração da unidade em ms, na velocidade 1×: o andamento da gravação. */
  baseMs: number
}

export interface RhythmAnnotations {
  /** Duração relativa por evento (id). Ausente = normal. */
  durations: Record<number, Duration>
  /** Eventos seguidos de uma pausa de uma unidade. */
  pausesAfter: number[]
  recorded?: RecordedRhythm
}

export const DEFAULT_BASE_MS = 620

export const EMPTY_RHYTHM: RhythmAnnotations = { durations: {}, pausesAfter: [] }

/** Duração do evento em unidades (1 = duração base), incluindo a pausa depois dele. */
export function eventUnits(rhythm: RhythmAnnotations, eventId: number): number {
  return noteUnits(rhythm, eventId) + (rhythm.pausesAfter.includes(eventId) ? 1 : 0)
}

export function noteUnits(rhythm: RhythmAnnotations, eventId: number): number {
  const manual = rhythm.durations[eventId]
  if (manual) return DURATION_MULTIPLIER[manual]
  return rhythm.recorded?.units[eventId] ?? 1
}

export function baseMsOf(rhythm: RhythmAnnotations): number {
  return rhythm.recorded?.baseMs ?? DEFAULT_BASE_MS
}

/** Escolher uma duração manual substitui o que foi gravado para aquela nota. */
export function setDuration(rhythm: RhythmAnnotations, eventId: number, duration: Duration): RhythmAnnotations {
  const durations = { ...rhythm.durations }
  if (duration === 'normal') delete durations[eventId]
  else durations[eventId] = duration
  let recorded = rhythm.recorded
  if (recorded && eventId in recorded.units) {
    const units = { ...recorded.units }
    delete units[eventId]
    recorded = { ...recorded, units }
  }
  return { ...rhythm, durations, recorded }
}

const MIN_BASE_MS = 120
const MAX_BASE_MS = 2400

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/**
 * Converte toques do aluno (um por nota, no tempo da música) em durações. A nota
 * mais comum vira a unidade; a última, sem próximo toque, fica com uma unidade.
 */
export function rhythmFromTaps(order: number[], taps: number[]): RecordedRhythm | null {
  const count = Math.min(order.length, taps.length)
  if (count < 2) return null
  const intervals = taps.slice(1, count).map((t, i) => t - taps[i])
  const baseMs = Math.min(MAX_BASE_MS, Math.max(MIN_BASE_MS, median(intervals)))
  const units: Record<number, number> = {}
  intervals.forEach((ms, i) => {
    units[order[i]] = Math.round(Math.min(8, Math.max(0.25, ms / baseMs)) * 100) / 100
  })
  units[order[count - 1]] = 1
  return { units, baseMs: Math.round(baseMs) }
}

/** Junta uma gravação nova com a anterior; notas regravadas substituem as antigas. */
export function mergeRecorded(rhythm: RhythmAnnotations, recorded: RecordedRhythm): RhythmAnnotations {
  const durations = { ...rhythm.durations }
  for (const id of Object.keys(recorded.units)) delete durations[Number(id)]
  const previous = rhythm.recorded
  const scale = previous ? recorded.baseMs / previous.baseMs : 1
  const kept = previous
    ? Object.fromEntries(Object.entries(previous.units).map(([id, u]) => [id, Math.round((u / scale) * 100) / 100]))
    : {}
  return { ...rhythm, durations, recorded: { baseMs: recorded.baseMs, units: { ...kept, ...recorded.units } } }
}

export function clearRecorded(rhythm: RhythmAnnotations): RhythmAnnotations {
  return { durations: rhythm.durations, pausesAfter: rhythm.pausesAfter }
}

export function togglePause(rhythm: RhythmAnnotations, eventId: number): RhythmAnnotations {
  const pausesAfter = rhythm.pausesAfter.includes(eventId)
    ? rhythm.pausesAfter.filter((id) => id !== eventId)
    : [...rhythm.pausesAfter, eventId].sort((a, b) => a - b)
  return { ...rhythm, pausesAfter }
}
