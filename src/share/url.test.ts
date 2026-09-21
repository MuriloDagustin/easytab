import { describe, expect, it } from 'vitest'
import { decodeShare, encodeShare } from './url'
import { EXAMPLE_TAB } from '../domain/tab/fixtures'

describe('compartilhamento por URL', () => {
  it('codifica e decodifica a tab sem perdas', () => {
    const hash = encodeShare({ text: EXAMPLE_TAB, tuningId: 'drop-d', capo: 2 })
    expect(decodeShare(`#${hash}`)).toEqual({ text: EXAMPLE_TAB, tuningId: 'drop-d', capo: 2 })
  })

  it('omite afinação padrão e capo zero', () => {
    const hash = encodeShare({ text: 'e|--3--|', tuningId: 'standard', capo: 0 })
    expect(hash).not.toContain('tuning')
    expect(hash).not.toContain('capo')
  })

  it('devolve null para hash inválido ou vazio', () => {
    expect(decodeShare('')).toBeNull()
    expect(decodeShare('#foo=bar')).toBeNull()
    expect(decodeShare('#tab=%%%')).toBeNull()
  })

  it('aceita caracteres especiais', () => {
    const text = 'e|--3\\5--|\nB|--7~~--|'
    expect(decodeShare(`#${encodeShare({ text })}`)?.text).toBe(text)
  })
})
