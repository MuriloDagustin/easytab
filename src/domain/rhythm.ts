export type Duration = 'short' | 'normal' | 'long'

export const DURATION_MULTIPLIER: Record<Duration, number> = { short: 0.5, normal: 1, long: 2 }
export const DURATION_LABELS: Record<Duration, string> = { short: 'Curta', normal: 'Normal', long: 'Longa' }

export interface RhythmAnnotations {
  /** Duração relativa por evento (id). Ausente = normal. */
  durations: Record<number, Duration>
  /** Eventos seguidos de uma pausa de uma unidade. */
  pausesAfter: number[]
}

export const EMPTY_RHYTHM: RhythmAnnotations = { durations: {}, pausesAfter: [] }

/** Duração do evento em unidades (1 = duração base), incluindo a pausa depois dele. */
export function eventUnits(rhythm: RhythmAnnotations, eventId: number): number {
  const duration = rhythm.durations[eventId] ?? 'normal'
  return DURATION_MULTIPLIER[duration] + (rhythm.pausesAfter.includes(eventId) ? 1 : 0)
}

export function noteUnits(rhythm: RhythmAnnotations, eventId: number): number {
  return DURATION_MULTIPLIER[rhythm.durations[eventId] ?? 'normal']
}

export function setDuration(rhythm: RhythmAnnotations, eventId: number, duration: Duration): RhythmAnnotations {
  const durations = { ...rhythm.durations }
  if (duration === 'normal') delete durations[eventId]
  else durations[eventId] = duration
  return { ...rhythm, durations }
}

export function togglePause(rhythm: RhythmAnnotations, eventId: number): RhythmAnnotations {
  const pausesAfter = rhythm.pausesAfter.includes(eventId)
    ? rhythm.pausesAfter.filter((id) => id !== eventId)
    : [...rhythm.pausesAfter, eventId].sort((a, b) => a - b)
  return { ...rhythm, pausesAfter }
}
