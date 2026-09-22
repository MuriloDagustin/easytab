import { describe, expect, it } from 'vitest'
import { staffNote } from './notation'

describe('staffNote', () => {
  it('escreve a 1ª corda solta (E4 real) no quarto espaço, uma oitava acima', () => {
    expect(staffNote(64)).toEqual({ step: 7, sharp: false, ledgers: [] })
  })

  it('escreve a 6ª corda solta (E2 real) com três linhas suplementares abaixo', () => {
    expect(staffNote(40)).toEqual({ step: -7, sharp: false, ledgers: [-2, -4, -6] })
  })

  it('marca sustenidos', () => {
    expect(staffNote(66)).toMatchObject({ step: 8, sharp: true })
  })

  it('usa linhas suplementares acima da pauta', () => {
    expect(staffNote(76).ledgers).toEqual([10, 12, 14])
  })
})
