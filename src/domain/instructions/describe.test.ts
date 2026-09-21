import { describe, expect, it } from 'vitest'
import { describeEvent } from './describe'
import { parseTab } from '../tab/parser'
import type { ParsedTab } from '../tab/types'

function parseOk(text: string): ParsedTab {
  const r = parseTab(text)
  if (!r.ok) throw new Error(r.error)
  return r.tab
}

const wrap = (lines: Partial<Record<'e' | 'B' | 'G' | 'D' | 'A' | 'E', string>>, len = 12) =>
  (['e', 'B', 'G', 'D', 'A', 'E'] as const).map((l) => `${l}|${(lines[l] ?? '').padEnd(len, '-')}|`).join('\n')

describe('describeEvent', () => {
  it('descreve corda solta', () => {
    const tab = parseOk(wrap({ G: '--0--' }))
    expect(describeEvent(tab.events[0]).main).toBe('Toque a 3ª corda (Sol) solta.')
  })

  it('descreve nota em casa', () => {
    const tab = parseOk(wrap({ B: '--3--' }))
    expect(describeEvent(tab.events[0]).main).toBe('Toque a 2ª corda (Si) na casa 3.')
  })

  it('descreve notas simultâneas', () => {
    const tab = parseOk(wrap({ e: '--3--', B: '--5--' }))
    expect(describeEvent(tab.events[0]).main).toBe(
      'Toque ao mesmo tempo: 1ª corda (Mi agudo) na casa 3 e 2ª corda (Si) na casa 5.',
    )
  })

  it('explica vibrato', () => {
    const tab = parseOk(wrap({ B: '--5~~~--' }))
    expect(describeEvent(tab.events[0]).details).toContain(
      'Mantenha a nota soando e balance o dedo para fazer vibrato.',
    )
  })

  it('explica hammer-on na nota de partida e na de chegada', () => {
    const tab = parseOk(wrap({ B: '--5h7--' }))
    expect(describeEvent(tab.events[0]).details[0]).toContain('hammer-on')
    expect(describeEvent(tab.events[1]).main).toContain('martele o dedo na casa 7')
  })

  it('mostra as alturas das notas', () => {
    const tab = parseOk(wrap({ B: '--3--' }))
    expect(describeEvent(tab.events[0]).pitches).toEqual(['2ª corda (Si): D4'])
  })
})

describe('describeEvent com símbolos adicionais e afinação', () => {
  it('explica corda abafada', () => {
    const tab = parseOk(wrap({ A: '--x--' }))
    expect(describeEvent(tab.events[0]).main).toContain('5ª corda (Lá) abafada')
    expect(describeEvent(tab.events[0]).pitches).toEqual([])
  })

  it('explica palm mute e cifra', () => {
    const text = `  G\n${wrap({ E: '--0--' })}\nPM---`
    const tab = parseOk(text)
    const d = describeEvent(tab.events[0])
    expect(d.details.some((s) => s.includes('Palm mute'))).toBe(true)
    expect(d.chord).toBe('G')
  })

  it('usa o nome da corda conforme a afinação', async () => {
    const { getTuning } = await import('../music/tuning')
    const tab = parseOk(wrap({ E: '--0--' }))
    const d = describeEvent(tab.events[0], { tuning: getTuning('drop-d'), capo: 0 })
    expect(d.main).toBe('Toque a 6ª corda (Ré) solta.')
    expect(d.pitches[0]).toContain('D2')
  })
})
