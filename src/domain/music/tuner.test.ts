import { describe, expect, it } from 'vitest'
import { readTuner, smoothFrequency } from './tuner'
import { DEFAULT_SETUP, getTuning, midiToFrequency } from './tuning'

describe('afinador', () => {
  it('reconhece a 5ª corda afinada', () => {
    expect(readTuner(110, DEFAULT_SETUP)).toMatchObject({ note: 'A2', string: 5, stringCents: 0, inTune: true })
  })

  it('mostra quanto a corda está abaixo', () => {
    const r = readTuner(midiToFrequency(40 - 0.2), DEFAULT_SETUP)
    expect(r.string).toBe(6)
    expect(r.stringCents).toBe(-20)
    expect(r.inTune).toBe(false)
  })

  it('usa a afinação escolhida', () => {
    expect(readTuner(midiToFrequency(38), { tuning: getTuning('drop-d'), capo: 0 })).toMatchObject({ string: 6, inTune: true })
  })

  it('suaviza pela mediana', () => {
    expect(smoothFrequency([110, 500, 111, 109, 110])).toBe(110)
  })
})
