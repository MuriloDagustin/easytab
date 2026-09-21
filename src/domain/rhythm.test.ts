import { describe, expect, it } from 'vitest'
import { EMPTY_RHYTHM, eventUnits, noteUnits, setDuration, togglePause } from './rhythm'

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
