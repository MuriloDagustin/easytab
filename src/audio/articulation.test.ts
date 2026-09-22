import { describe, expect, it } from 'vitest'
import { nearestSample, pitchPlan, playbackRate, toneColor } from './articulation'
import type { Note } from '../domain/tab/types'

const note = (partial: Partial<Note>): Note => ({ string: 2, fret: 7, techniques: [], ...partial })

describe('articulação', () => {
  it('bend sobe continuamente até a casa de destino', () => {
    const plan = pitchPlan(note({ techniques: ['bend'], targetFret: 9 }), 66, 1)
    expect(plan.points.at(-1)).toEqual({ at: 0.45, midi: 68, ramp: 'linear' })
  })

  it('bend sem destino sobe um tom', () => {
    expect(pitchPlan(note({ techniques: ['bend'] }), 66, 1).points.at(-1)?.midi).toBe(68)
  })

  it('release desce até a casa indicada', () => {
    const plan = pitchPlan(note({ fret: 9, techniques: ['release'], targetFret: 7 }), 68, 1)
    expect(plan.points.at(-1)).toMatchObject({ midi: 66, ramp: 'linear' })
  })

  it('slide passa casa por casa até o destino', () => {
    const plan = pitchPlan(note({ fret: 5, techniques: ['slide-up'], targetFret: 8 }), 64, 1)
    expect(plan.points.map((p) => p.midi)).toEqual([64, 65, 66, 67])
    expect(plan.points.every((p) => p.ramp === 'step')).toBe(true)
    expect(plan.fadeOut).toBe(false)
  })

  it('slide para fora desce quatro casas e some', () => {
    const plan = pitchPlan(note({ fret: 10, techniques: ['slide-down'] }), 69, 1)
    expect(plan.points.at(-1)?.midi).toBe(65)
    expect(plan.fadeOut).toBe(true)
  })

  it('hammer-on e notas simples não mudam de altura dentro do evento', () => {
    expect(pitchPlan(note({ techniques: ['hammer-on'], targetFret: 9 }), 66, 1).points).toEqual([])
    expect(pitchPlan(note({ techniques: ['vibrato'] }), 66, 1).points).toEqual([])
  })

  it('corda grossa e casa alta soam mais escuras', () => {
    expect(toneColor(6, 5)).toBeLessThan(toneColor(1, 0))
    expect(toneColor(3, 12)).toBeLessThan(toneColor(3, 0))
  })

  it('escolhe a amostra mais próxima e calcula a velocidade de leitura', () => {
    expect(nearestSample(47, [40, 43, 46, 49])).toBe(46)
    expect(nearestSample(48, [46, 50])).toBe(46)
    expect(playbackRate(52, 40)).toBeCloseTo(2, 6)
  })
})
