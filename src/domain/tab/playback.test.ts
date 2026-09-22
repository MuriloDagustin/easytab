import { describe, expect, it } from 'vitest'
import { parseTab } from './parser'
import { orderFrom, playbackOrder, sectionsOf } from './playback'
import type { ParsedTab } from './types'

const block = (note: string) =>
  ['e', 'B', 'G', 'D', 'A', 'E'].map((l) => `${l}|${(l === 'B' ? note : '').padEnd(8, '-')}|`).join('\n')

function parseOk(text: string): ParsedTab {
  const r = parseTab(text)
  if (!r.ok) throw new Error(r.error)
  return r.tab
}

describe('repetições indicadas na tab', () => {
  it('lê "x2" no fim das linhas como repetição do bloco, sem virar nota', () => {
    const text = block('--3--')
      .split('\n')
      .map((l) => `${l}  x2`)
      .join('\n')
    const tab = parseOk(text)
    expect(tab.blocks[0].repeat).toBe(2)
    expect(tab.events).toHaveLength(1)
    expect(tab.events[0].notes[0].muted).toBeUndefined()
  })

  it('lê "2X" e "2 vezes" no título como repetição da seção inteira', () => {
    const text = `[Intro]\n${block('--1--')}\n\n* 2 VEZES SEGUIDAS *\n${block('--2--')}\n\n${block('--3--')}\n\n[Verso] 2X\n${block('--4--')}`
    const tab = parseOk(text)
    expect(sectionsOf(tab).map((s) => [s.blocks, s.repeat])).toEqual([
      [[0], 1],
      [[1, 2], 2],
      [[3], 2],
    ])
    const frets = (ids: number[]) => ids.map((id) => tab.events[id].notes[0].fret)
    expect(frets(playbackOrder(tab, () => true, true))).toEqual([1, 2, 3, 2, 3, 4, 4])
    expect(frets(playbackOrder(tab, () => true, false))).toEqual([1, 2, 3, 4])
  })

  it('observações soltas não quebram a seção', () => {
    const text = `[Riff] 2x\n${block('--1--')}\n\nOBS: arrastar a nota\n${block('--2--')}`
    const tab = parseOk(text)
    expect(sectionsOf(tab)).toEqual([{ blocks: [0, 1], repeat: 2 }])
  })

  it('não confunde "Parte 2 de 12" com repetição', () => {
    expect(parseOk(`Parte 2 de 12\n${block('--1--')}`).blocks[0].sectionRepeat).toBeUndefined()
  })

  it('começa a partir do evento atual', () => {
    expect(orderFrom([0, 1, 2, 1, 2, 3], 2)).toEqual([2, 1, 2, 3])
    expect(orderFrom([0, 2, 4], 3)).toEqual([4])
  })
})
