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

describe('outros compassos', () => {
  it('3/4: bumbo no 1, caixa no 2 e no 3, acento a cada 6 colcheias', () => {
    const bar = [0, 1, 2, 3, 4, 5].map((e) => hitsAt(e, 'simple', true, 3))
    expect(bar.map((h) => h.kick)).toEqual([true, false, false, false, false, false])
    expect(bar.map((h) => h.snare)).toEqual([false, false, true, false, true, false])
    expect(hitsAt(6, 'off', true, 3).accent).toBe(true)
  })

  it('2/4: bumbo no 1 e caixa no 2', () => {
    expect([0, 2].map((e) => [hitsAt(e, 'rock', false, 2).kick, hitsAt(e, 'rock', false, 2).snare])).toEqual([
      [true, false],
      [false, true],
    ])
  })
})
