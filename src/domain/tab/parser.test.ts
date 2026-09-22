import { describe, expect, it } from 'vitest'
import { parseTab } from './parser'
import { CIFRA_CLUB_TAB, EXAMPLE_TAB, MULTI_BLOCK_TAB, TECHNIQUES_TAB, TWO_DIGIT_TAB, UNLABELED_TAB } from './fixtures'
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

describe('símbolos adicionais', () => {
  it('lê corda abafada (x) como nota muda', () => {
    const tab = parseOk(wrap({ A: '--x--3--' }))
    expect(tab.events[0].notes[0]).toMatchObject({ string: 5, fret: 0, muted: true })
    expect(tab.events[1].notes[0]).toMatchObject({ fret: 3 })
    expect(tab.events[1].notes[0].muted).toBeUndefined()
  })

  it('lê tapping (t) como técnica de ligação', () => {
    const tab = parseOk(wrap({ e: '--5t12--' }))
    expect(tab.events[0].notes[0]).toMatchObject({ fret: 5, techniques: ['tapping'], targetFret: 12 })
    expect(tab.events[1].notes[0]).toMatchObject({ fret: 12, arrivedBy: 'tapping' })
  })

  it('marca palm mute pelas colunas da linha PM', () => {
    const text = `${wrap({ E: '--0--0--0--0--' }, 14)}\n  PM------`
    const tab = parseOk(text)
    expect(tab.events.map((e) => e.notes[0].palmMute ?? false)).toEqual([true, true, false, false])
  })

  it('associa cifras escritas acima da tab aos eventos', () => {
    const text = `  G     D\n${wrap({ B: '--3-----3--' }, 11)}`
    const tab = parseOk(text)
    expect(tab.events.map((e) => e.chord)).toEqual(['G', 'D'])
    expect(tab.blocks[0].chordLine).toBe('  G     D')
  })

  it('não confunde texto comum com linha de cifras', () => {
    const text = `Verso 1\n${wrap({ B: '--3--' })}`
    const tab = parseOk(text)
    expect(tab.events[0].chord).toBeUndefined()
    expect(tab.blocks[0].chordLine).toBeUndefined()
  })
})

describe('tablatura colada inteira do Cifra Club', () => {
  const tab = parseOk(CIFRA_CLUB_TAB)

  it('lê todos os blocos sem descartar nenhum, incluindo linhas sem hífens duplos', () => {
    expect(tab.warnings).toEqual([])
    expect(tab.blocks).toHaveLength(6)
    const dense = tab.blocks.at(-1)!
    expect(tab.events.filter((e) => e.blockIndex === dense.index)).toHaveLength(8)
  })

  it('usa a ordem de cima para baixo quando o rótulo E aparece nas duas pontas', () => {
    expect(tab.events[0].notes[0]).toMatchObject({ string: 3, fret: 0 })
  })

  it('trata a quebra de linha do site como bloco seguinte, na sequência', () => {
    const wrapped = tab.blocks[3]
    expect(wrapped.lines[0].startsWith('E|15--12--11--10-|')).toBe(true)
    expect(tab.events.filter((e) => e.blockIndex === 3).map((e) => e.notes[0].fret)).toEqual([15, 12, 11, 10])
  })

  it('aceita casas com zero à esquerda e barras de compasso no meio', () => {
    const riff2 = tab.events.filter((e) => e.blockIndex === 1)
    expect(riff2.some((e) => e.notes.some((n) => n.fret === 8))).toBe(true)
    expect(riff2.some((e) => e.notes.some((n) => n.fret === 5 && n.targetFret === 17))).toBe(true)
  })

  it('guarda títulos de seção e observações como rótulo do bloco', () => {
    expect(tab.blocks[0].heading).toBe('1º RIFF')
    expect(tab.blocks[1].heading).toContain('2º RIFF')
    expect(tab.blocks[1].heading).toContain('2 VEZES SEGUIDAS')
    expect(tab.blocks[1].heading).not.toContain('daqui')
    expect(tab.blocks[2].heading).toBe('OBS: neste ultimo *10 arrastar a nota até o final do braço')
    expect(tab.blocks[3].heading).toBeUndefined()
    expect(tab.blocks[4].heading).toContain('ABAFANDO AS CORDAS')
    expect(tab.blocks[5].heading).toBeUndefined()
  })
})

describe('sujeira comum em cifras coladas de sites', () => {
  it('aceita travessão no lugar de hífen', () => {
    const tab = parseOk(wrap({ e: '-3\u2013\u2013\u2013\u20133--', B: '---\u2014--' }))
    expect(tab.events.map((e) => e.notes[0].fret)).toEqual([3, 3])
    expect(tab.warnings).toEqual([])
  })

  it('trata reticências e pontos como preenchimento', () => {
    const tab = parseOk(wrap({ G: '-7h9p7.../12~' }, 20))
    const frets = tab.events.map((e) => e.notes[0].fret)
    expect(frets).toEqual([7, 9, 7, 12])
    expect(tab.events.at(-1)!.notes[0].techniques).toEqual(['vibrato'])
  })

  it('bend e slide sem casa de destino ficam sem targetFret', () => {
    const tab = parseOk(wrap({ B: '-12b--', E: '----10\\--' }))
    const bend = tab.events[0].notes[0]
    expect(bend).toMatchObject({ fret: 12, techniques: ['bend'] })
    expect(bend.targetFret).toBeUndefined()
    const slide = tab.events[1].notes[0]
    expect(slide).toMatchObject({ fret: 10, techniques: ['slide-down'] })
    expect(slide.targetFret).toBeUndefined()
  })

  it('técnica solta antes da nota não vira nota nem quebra a leitura', () => {
    const tab = parseOk(wrap({ B: '-b17r15--' }))
    expect(tab.events.map((e) => e.notes[0].fret)).toEqual([17, 15])
    expect(tab.events[0].notes[0].techniques).toEqual(['release'])
  })

  it('prioriza marcadores de seção sobre a letra da música no rótulo do bloco', () => {
    const text = `A5    ( A5  B5 ) C5
Oh oh            oh
Sweet child o' mine

[Solo 1] E5  C5  B5  A5

[Tab - Solo 1]

Parte 1 de 6
${wrap({ e: '-17b19~~--' })}`
    const tab = parseOk(text)
    expect(tab.blocks[0].heading).toContain('[Solo 1]')
    expect(tab.blocks[0].heading).toContain('Parte 1 de 6')
    expect(tab.blocks[0].heading).not.toContain('Sweet child')
  })

  it('sem marcadores, usa o texto livre como rótulo', () => {
    const tab = parseOk(`neste ultimo arrastar a nota\n${wrap({ e: '-10--' })}`)
    expect(tab.blocks[0].heading).toBe('neste ultimo arrastar a nota')
  })
})
