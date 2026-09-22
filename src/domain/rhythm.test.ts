import { describe, expect, it } from 'vitest'
import { EMPTY_RHYTHM, baseMsOf, clearRecorded, eventUnits, mergeRecorded, noteUnits, rhythmFromTaps, setDuration, togglePause } from './rhythm'

describe('ritmo manual', () => {
  it('evento sem anotação dura uma unidade', () => {
    expect(eventUnits(EMPTY_RHYTHM, 0)).toBe(1)
  })

  it('aplica duração curta, longa e pausa', () => {
    let r = setDuration(EMPTY_RHYTHM, 0, 'long')
    r = togglePause(r, 0)
    expect(noteUnits(r, 0)).toBe(2)
    expect(eventUnits(r, 0)).toBe(3)
    r = setDuration(r, 0, 'short')
    expect(noteUnits(r, 0)).toBe(0.5)
  })

  it('volta ao normal removendo a anotação e desfaz a pausa', () => {
    let r = setDuration(EMPTY_RHYTHM, 3, 'short')
    r = setDuration(r, 3, 'normal')
    expect(r.durations).toEqual({})
    r = togglePause(togglePause(r, 3), 3)
    expect(r.pausesAfter).toEqual([])
  })
})

describe('ritmo gravado tocando junto', () => {
  it('transforma toques em durações relativas à nota mais comum', () => {
    const recorded = rhythmFromTaps([0, 1, 2, 3, 4], [1000, 1500, 2000, 3000, 3250])!
    expect(recorded.baseMs).toBe(500)
    expect(recorded.units).toEqual({ 0: 1, 1: 1, 2: 2, 3: 0.5, 4: 1 })
  })

  it('precisa de pelo menos dois toques', () => {
    expect(rhythmFromTaps([0, 1], [1000])).toBeNull()
  })

  it('a gravação vale na reprodução e duração manual a substitui', () => {
    let r = mergeRecorded(EMPTY_RHYTHM, rhythmFromTaps([0, 1, 2], [0, 400, 1200])!)
    expect(baseMsOf(r)).toBe(800)
    expect(noteUnits(r, 0)).toBe(0.5)
    r = setDuration(r, 0, 'long')
    expect(noteUnits(r, 0)).toBe(2)
    expect(r.recorded?.units[0]).toBeUndefined()
    r = setDuration(r, 0, 'normal')
    expect(noteUnits(r, 0)).toBe(1)
  })

  it('regravar um trecho mantém o resto na escala do novo andamento', () => {
    let r = mergeRecorded(EMPTY_RHYTHM, { baseMs: 500, units: { 0: 1, 1: 2 } })
    r = mergeRecorded(r, { baseMs: 1000, units: { 1: 1 } })
    expect(r.recorded).toEqual({ baseMs: 1000, units: { 0: 0.5, 1: 1 } })
  })

  it('apagar a gravação volta ao andamento padrão', () => {
    const r = clearRecorded(mergeRecorded(EMPTY_RHYTHM, { baseMs: 500, units: { 0: 2 } }))
    expect(baseMsOf(r)).toBe(620)
    expect(eventUnits(r, 0)).toBe(1)
  })
})
