export type DrumPattern = 'off' | 'simple' | 'rock'

export const DRUM_PATTERNS: Array<{ id: DrumPattern; name: string }> = [
  { id: 'off', name: 'sem bateria' },
  { id: 'simple', name: 'batida simples' },
  { id: 'rock', name: 'rock' },
]

export interface BeatHits {
  kick: boolean
  snare: boolean
  hat: boolean
  click: boolean
  accent: boolean
}

/** O que soa em cada colcheia de um compasso 4/4 (0 a 7). */
export function hitsAt(eighth: number, pattern: DrumPattern, metronome: boolean): BeatHits {
  const e = ((eighth % 8) + 8) % 8
  const onBeat = e % 2 === 0
  const kick = pattern === 'rock' ? [0, 4, 5].includes(e) : pattern === 'simple' ? [0, 4].includes(e) : false
  const snare = pattern !== 'off' && [2, 6].includes(e)
  const hat = pattern === 'rock' || (pattern === 'simple' && onBeat)
  return { kick, snare, hat, click: metronome && onBeat, accent: e === 0 }
}
