import { describe, expect, it } from 'vitest'
import { parseTab } from './parser'
import { EXAMPLE_TAB, MULTI_BLOCK_TAB, TECHNIQUES_TAB, TWO_DIGIT_TAB, UNLABELED_TAB } from './fixtures'
import type { ParsedTab } from './types'

function parseOk(text: string): ParsedTab {
  const result = parseTab(text)
  if (!result.ok) throw new Error(result.error)
  return result.tab
}

const wrap = (lines: Partial<Record<'e' | 'B' | 'G' | 'D' | 'A' | 'E', string>>, len = 10) =>
  (['e', 'B', 'G', 'D', 'A', 'E'] as const)
    .map((l) => `${l}|${(lines[l] ?? '').padEnd(len, '-')}|`)
    .join('\n')

describe('parseTab', () => {
  it('lê uma nota em uma corda', () => {
    const tab = parseOk(wrap({ B: '--3--' }))
    expect(tab.events).toHaveLength(1)
    expect(tab.events[0].notes).toEqual([{ string: 2, fret: 3, techniques: [] }])
    expect(tab.events[0].column).toBe(2)
  })

  it('lê corda solta como casa 0', () => {
    const tab = parseOk(wrap({ G: '--0--' }))
    expect(tab.events[0].notes[0]).toMatchObject({ string: 3, fret: 0 })
  })

  it('diferencia a corda e aguda da E grave', () => {
    const tab = parseOk(wrap({ e: '--1--', E: '-----6' }))
    expect(tab.events.map((e) => e.notes[0].string)).toEqual([1, 6])
  })

  it('aceita casas com dois dígitos', () => {
    const tab = parseOk(TWO_DIGIT_TAB)
    expect(tab.events.map((e) => e.notes[0].fret)).toEqual([10, 12, 15])
    expect(tab.events[0].width).toBe(2)
  })

  it('agrupa números alinhados como notas simultâneas', () => {
    const tab = parseOk(wrap({ e: '--3--', B: '--5--', G: '--0--' }))
    expect(tab.events).toHaveLength(1)
    expect(tab.events[0].notes.map((n) => [n.string, n.fret])).toEqual([
      [1, 3],
      [2, 5],
      [3, 0],
    ])
  })

  it('reconhece vibrato', () => {
    const tab = parseOk(wrap({ B: '--5~~~--' }))
    expect(tab.events[0].notes[0].techniques).toEqual(['vibrato'])
  })

  it('reconhece hammer-on com casa de destino e gera a nota de chegada', () => {
    const tab = parseOk(wrap({ B: '--5h7--' }))
    expect(tab.events).toHaveLength(2)
    expect(tab.events[0].notes[0]).toMatchObject({ fret: 5, techniques: ['hammer-on'], targetFret: 7 })
    expect(tab.events[1].notes[0]).toMatchObject({ fret: 7, arrivedBy: 'hammer-on' })
  })

  it('reconhece pull-off', () => {
    const tab = parseOk(wrap({ B: '--7p5--' }))
    expect(tab.events[0].notes[0]).toMatchObject({ fret: 7, techniques: ['pull-off'], targetFret: 5 })
    expect(tab.events[1].notes[0]).toMatchObject({ fret: 5, arrivedBy: 'pull-off' })
  })

  it('reconhece slide ascendente e descendente', () => {
    const tab = parseOk(wrap({ B: '--5/7--', G: '--7\\5--' }, 12))
    const [first, second] = tab.events
    expect(first.notes.find((n) => n.string === 2)?.techniques).toEqual(['slide-up'])
    expect(first.notes.find((n) => n.string === 3)?.techniques).toEqual(['slide-down'])
    expect(second.notes.map((n) => n.arrivedBy)).toEqual(['slide-up', 'slide-down'])
  })

  it('reconhece bend e release', () => {
    const tab = parseOk(TECHNIQUES_TAB)
    const bends = tab.events.flatMap((e) => e.notes).filter((n) => n.techniques.includes('bend'))
    const releases = tab.events.flatMap((e) => e.notes).filter((n) => n.techniques.includes('release'))
    expect(bends[0]).toMatchObject({ fret: 7, targetFret: 9 })
    expect(releases[0]).toMatchObject({ fret: 9, targetFret: 7 })
  })

  it('lê múltiplos blocos em sequência', () => {
    const tab = parseOk(MULTI_BLOCK_TAB)
    expect(tab.blocks).toHaveLength(2)
    expect(tab.events.map((e) => [e.blockIndex, e.notes[0].string, e.notes[0].fret])).toEqual([
      [0, 1, 3],
      [1, 2, 5],
    ])
  })

  it('aceita tab sem rótulos assumindo ordem padrão', () => {
    const tab = parseOk(UNLABELED_TAB)
    expect(tab.events.map((e) => e.notes[0].string)).toEqual([1, 6])
  })

  it('rejeita entrada vazia e texto comum com mensagem compreensível', () => {
    expect(parseTab('')).toMatchObject({ ok: false, error: expect.stringContaining('Cole') })
    const result = parseTab('Isso é só um texto qualquer\nsem tablatura nenhuma.')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('6 cordas')
  })

  it('rejeita bloco sem notas', () => {
    const result = parseTab(wrap({}))
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('nenhuma nota') })
  })

  it('avisa sobre blocos com número errado de linhas', () => {
    const tab = parseOk(`${EXAMPLE_TAB}\n\ne|--3--|\nB|-----|`)
    expect(tab.warnings.some((w) => w.includes('6 cordas'))).toBe(true)
  })

  it('processa a tablatura de exemplo com os eventos esperados', () => {
    const tab = parseOk(EXAMPLE_TAB)
    expect(tab.events).toHaveLength(11)
    const simultaneous = tab.events.filter((e) => e.notes.length > 1)
    expect(simultaneous).toHaveLength(2)
    expect(simultaneous[0].notes.map((n) => [n.string, n.fret])).toEqual([
      [1, 3],
      [2, 5],
    ])
    const last = tab.events.at(-1)!
    expect(last.notes[0]).toMatchObject({ string: 2, fret: 5, techniques: ['vibrato'] })
  })

  it('preserva o deslocamento do corpo para destacar a linha original', () => {
    const tab = parseOk(EXAMPLE_TAB)
    expect(tab.blocks[0].bodyOffsets).toEqual([2, 2, 2, 2, 2, 2])
    expect(tab.blocks[0].lines[0].startsWith('e|')).toBe(true)
  })
})
