import { describe, expect, it } from 'vitest'
import { fretToFrequency, fretToNoteName, midiToFrequency } from './tuning'

describe('afinação padrão', () => {
  it('corda 6 solta é E2 (82,41 Hz)', () => {
    expect(fretToFrequency(6, 0)).toBeCloseTo(82.41, 1)
    expect(fretToNoteName(6, 0)).toBe('E2')
  })

  it('corda 5 solta é A2 (110 Hz)', () => {
    expect(fretToFrequency(5, 0)).toBeCloseTo(110, 2)
  })

  it('corda 1 solta é E4 (329,63 Hz)', () => {
    expect(fretToFrequency(1, 0)).toBeCloseTo(329.63, 1)
    expect(fretToNoteName(1, 0)).toBe('E4')
  })

  it('corda 2 casa 3 é D4 (293,66 Hz)', () => {
    expect(fretToFrequency(2, 3)).toBeCloseTo(293.66, 1)
    expect(fretToNoteName(2, 3)).toBe('D4')
  })

  it('casa 12 dobra a frequência da corda solta', () => {
    expect(fretToFrequency(3, 12)).toBeCloseTo(fretToFrequency(3, 0) * 2, 5)
  })

  it('A4 (MIDI 69) é 440 Hz', () => {
    expect(midiToFrequency(69)).toBe(440)
  })
})
