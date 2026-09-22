import { describe, expect, it } from 'vitest'
import { DEFAULT_METER, beatMs, bpmFromTaps, effectiveBpm, unitMs } from './meter'
import { EMPTY_RHYTHM } from './rhythm'

describe('andamento e compasso', () => {
  it('sem andamento definido usa a duração padrão e a semínima como nota normal', () => {
    expect(unitMs(DEFAULT_METER, EMPTY_RHYTHM)).toBe(620)
    expect(effectiveBpm(DEFAULT_METER, EMPTY_RHYTHM)).toBe(97)
  })

  it('com andamento definido, a nota normal segue a figura escolhida', () => {
    const meter = { bpm: 120, beats: 4 as const, unit: 'eighth' as const }
    expect(unitMs(meter, EMPTY_RHYTHM)).toBe(250)
    expect(beatMs(meter, EMPTY_RHYTHM)).toBe(500)
  })

  it('o ritmo gravado define o andamento quando não há valor manual', () => {
    const rhythm = { ...EMPTY_RHYTHM, recorded: { baseMs: 300, units: {} } }
    expect(effectiveBpm({ ...DEFAULT_METER, unit: 'eighth' }, rhythm)).toBe(100)
  })

  it('calcula o andamento por toques', () => {
    expect(bpmFromTaps([0, 500, 1000, 1510, 2000])).toBe(120)
    expect(bpmFromTaps([0, 500])).toBeNull()
  })
})
