import { describe, expect, it } from 'vitest'
import { noteValue, staffNote } from './notation'

describe('staffNote', () => {
  it('escreve a 1ª corda solta (E4 real) no quarto espaço, uma oitava acima', () => {
    expect(staffNote(64)).toEqual({ step: 7, accidental: null, ledgers: [] })
  })

  it('escreve a 6ª corda solta (E2 real) com três linhas suplementares abaixo', () => {
    expect(staffNote(40)).toEqual({ step: -7, accidental: null, ledgers: [-2, -4, -6] })
  })

  it('usa sustenido em Dó maior e esconde o acidente quando a armadura já tem', () => {
    expect(staffNote(66)).toMatchObject({ step: 8, accidental: 'sharp' })
    expect(staffNote(66, 1)).toMatchObject({ step: 8, accidental: null })
  })

  it('escreve bemol em tonalidades com bemóis', () => {
    // Si bemol real (A#3 = 58) em Fá maior: armadura já tem o bemol.
    expect(staffNote(58, -1)).toMatchObject({ step: 4, accidental: null })
    // A mesma altura em Dó maior vira Lá sustenido.
    expect(staffNote(58, 0)).toMatchObject({ step: 3, accidental: 'sharp' })
  })

  it('marca bequadro quando a nota cancela a armadura', () => {
    // Fá natural real (F4 = 65) em Sol maior.
    expect(staffNote(65, 1)).toMatchObject({ step: 8, accidental: 'natural' })
  })

  it('usa linhas suplementares acima da pauta', () => {
    expect(staffNote(76).ledgers).toEqual([10, 12, 14])
  })
})

describe('noteValue', () => {
  it('escolhe a figura mais próxima', () => {
    expect(noteValue(1).name).toBe('semínima')
    expect(noteValue(0.5)).toMatchObject({ flags: 1, head: 'black' })
    expect(noteValue(2)).toMatchObject({ head: 'half', stem: true })
    expect(noteValue(1.4).name).toBe('semínima pontuada')
    expect(noteValue(0.2).flags).toBe(2)
    expect(noteValue(5).head).toBe('whole')
  })
})
