import type { Note, StringNumber } from '../domain/tab/types'

export type Ramp = 'step' | 'linear'

export interface PitchPoint {
  /** Segundos desde o início da nota. */
  at: number
  midi: number
  ramp: Ramp
}

export interface PitchPlan {
  points: PitchPoint[]
  /** A nota some no fim (slide para fora, sem casa de destino). */
  fadeOut: boolean
}

const BEND_WITHOUT_TARGET = 2
const SLIDE_OUT_FRETS = 4

/**
 * Como a altura da nota se move enquanto ela soa neste evento. Hammer-on, pull-off e
 * tapping não aparecem aqui: a nota de chegada muda a altura da mesma voz, sem novo ataque.
 */
export function pitchPlan(note: Note, midi: number, duration: number): PitchPlan {
  const technique = note.techniques.find((t) => t !== 'vibrato')
  const delta = note.targetFret !== undefined ? note.targetFret - note.fret : null
  switch (technique) {
    case 'bend': {
      const target = midi + (delta ?? BEND_WITHOUT_TARGET)
      return { points: [{ at: 0, midi, ramp: 'step' }, { at: duration * 0.1, midi, ramp: 'step' }, { at: duration * 0.45, midi: target, ramp: 'linear' }], fadeOut: false }
    }
    case 'release': {
      const target = midi + (delta ?? -BEND_WITHOUT_TARGET)
      return { points: [{ at: 0, midi, ramp: 'step' }, { at: duration * 0.15, midi, ramp: 'step' }, { at: duration * 0.6, midi: target, ramp: 'linear' }], fadeOut: false }
    }
    case 'slide-up':
    case 'slide-down': {
      const direction = technique === 'slide-up' ? 1 : -1
      const frets = delta ?? direction * SLIDE_OUT_FRETS
      const steps = Math.abs(frets)
      if (!steps) return { points: [], fadeOut: false }
      const start = delta === null ? 0.3 : 0.55
      const end = 0.9
      const points: PitchPoint[] = [{ at: 0, midi, ramp: 'step' }]
      for (let i = 1; i <= steps; i++) {
        points.push({ at: duration * (start + ((end - start) * i) / steps), midi: midi + Math.sign(frets) * i, ramp: 'step' })
      }
      return { points, fadeOut: delta === null }
    }
    default:
      return { points: [], fadeOut: false }
  }
}

const BRIGHTNESS: Record<StringNumber, number> = { 1: 9000, 2: 7600, 3: 6200, 4: 5200, 5: 4300, 6: 3600 }

/**
 * Corte do filtro por corda: a mesma nota soa mais escura numa corda grossa e casa alta
 * do que numa corda fina e casa baixa.
 */
export function toneColor(string: StringNumber, fret: number): number {
  return Math.round(BRIGHTNESS[string] * Math.pow(0.975, fret))
}

export function nearestSample(midi: number, samples: number[]): number {
  let best = samples[0]
  for (const s of samples) if (Math.abs(s - midi) < Math.abs(best - midi) || (Math.abs(s - midi) === Math.abs(best - midi) && s < best)) best = s
  return best
}

export function playbackRate(midi: number, sampleMidi: number): number {
  return Math.pow(2, (midi - sampleMidi) / 12)
}
