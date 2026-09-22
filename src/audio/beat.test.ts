import { describe, expect, it } from 'vitest'
import { hitsAt } from './beat'

describe('grade de bateria e metrônomo', () => {
  it('rock: bumbo no 1 e 3, caixa no 2 e 4, chimbal em toda colcheia', () => {
    const bar = [0, 1, 2, 3, 4, 5, 6, 7].map((e) => hitsAt(e, 'rock', false))
    expect(bar.map((h) => h.kick)).toEqual([true, false, false, false, true, true, false, false])
    expect(bar.map((h) => h.snare)).toEqual([false, false, true, false, false, false, true, false])
    expect(bar.every((h) => h.hat)).toBe(true)
  })

  it('metrônomo clica só nos tempos e acentua o primeiro', () => {
    const bar = [0, 1, 2, 3, 4, 5, 6, 7].map((e) => hitsAt(e, 'off', true))
    expect(bar.map((h) => h.click)).toEqual([true, false, true, false, true, false, true, false])
    expect(hitsAt(8, 'off', true).accent).toBe(true)
    expect(bar.some((h) => h.kick || h.snare || h.hat)).toBe(false)
  })
})
