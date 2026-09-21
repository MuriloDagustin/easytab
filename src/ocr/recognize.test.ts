import { describe, expect, it } from 'vitest'
import { cleanupTabText, countTabLines, findTextBands } from './recognize'

describe('OCR: pós-processamento', () => {
  it('corrige confusões comuns só em linhas de tablatura', () => {
    const raw = 'Título da música\ne l--O--3--l\nB |—-5--—|'
    expect(cleanupTabText(raw)).toBe('Título da música\ne|--0--3--|\nB|--5---|')
  })

  it('remove linhas vazias', () => {
    expect(cleanupTabText('\n\ne|--3--|\n\n')).toBe('e|--3--|')
  })
})

describe('OCR: faixas de texto', () => {
  it('separa seis linhas de tinta', () => {
    const rows: number[] = []
    for (let line = 0; line < 6; line++) {
      rows.push(...Array(8).fill(0), ...Array(10).fill(200))
    }
    rows.push(...Array(8).fill(0))
    const bands = findTextBands(rows, 1000)
    expect(bands).toHaveLength(6)
    // Faixas expandidas até quase metade do espaçamento (18 px) em volta do centro (13).
    expect(bands[0].top).toBeLessThanOrEqual(5)
    expect(bands[0].bottom).toBeGreaterThanOrEqual(21)
    expect(bands[1].top).toBeGreaterThanOrEqual(bands[0].bottom - 1)
  })

  it('ancora nos traços fortes e ignora as faixas fracas dos números', () => {
    const rows: number[] = []
    for (let line = 0; line < 6; line++) {
      // números acima do traço (tinta fraca), traço de hífens (tinta forte), números abaixo
      rows.push(...Array(4).fill(0), ...Array(4).fill(30), 0, ...Array(3).fill(600), 0, ...Array(4).fill(30))
    }
    rows.push(...Array(4).fill(0))
    const bands = findTextBands(rows, 1000)
    expect(bands).toHaveLength(6)
    // cada faixa cobre também as linhas fracas dos números
    expect(bands[1].top).toBeLessThanOrEqual(21 + 4)
    expect(bands[1].bottom).toBeGreaterThanOrEqual(21 + 13)
  })

  it('conta linhas que parecem cordas de tablatura', () => {
    expect(countTabLines('e|---3---|\nB|-------|\nTítulo\nG|---0---|')).toBe(3)
  })
})
