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

/** O que soa em cada colcheia de um compasso com `beats` tempos. */
export function hitsAt(eighth: number, pattern: DrumPattern, metronome: boolean, beats = 4): BeatHits {
  const perBar = beats * 2
  const e = ((eighth % perBar) + perBar) % perBar
  const onBeat = e % 2 === 0
  const beat = e / 2
  const strongBeats = beats === 4 ? [0, 2] : [0]
  let kick = false
  if (pattern !== 'off' && onBeat && strongBeats.includes(beat)) kick = true
  if (pattern === 'rock' && beats === 4 && e === 5) kick = true
  const snare = pattern !== 'off' && onBeat && !strongBeats.includes(beat)
  const hat = pattern === 'rock' || (pattern === 'simple' && onBeat)
  return { kick, snare, hat, click: metronome && onBeat, accent: e === 0 }
}
