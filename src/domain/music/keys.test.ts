import { describe, expect, it } from 'vitest'
import { detectKey, keyOf, spellPitch } from './keys'

const scale = (tonic: number, steps: number[]) => steps.map((s) => 60 + tonic + s)
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11, 12, 7, 4, 0, 7]

describe('tonalidade', () => {
  it('detecta Sol maior pela escala', () => {
    expect(detectKey(scale(7, MAJOR_STEPS))).toMatchObject({ tonic: 7, mode: 'major', fifths: 1, name: 'Sol maior' })
  })

  it('detecta Fá maior e usa bemol', () => {
    expect(detectKey(scale(5, MAJOR_STEPS))).toMatchObject({ fifths: -1, name: 'Fá maior' })
  })

  it('detecta Lá menor com peso das cifras', () => {
    expect(detectKey([57, 60, 64, 69, 64, 60, 57], [9, 0, 4]).name).toBe('Lá menor')
  })

  it('nomeia tonalidades com bemol', () => {
    expect(keyOf(10, 'major').name).toBe('Si♭ maior')
    expect(keyOf(1, 'major').fifths).toBe(-5)
  })

  it('grafa notas cromáticas conforme a armadura', () => {
    expect(spellPitch(6, 0)).toEqual({ letter: 3, alter: 1 })
    expect(spellPitch(10, -1)).toEqual({ letter: 6, alter: -1 })
    expect(spellPitch(8, -3)).toEqual({ letter: 5, alter: -1 })
  })
})
