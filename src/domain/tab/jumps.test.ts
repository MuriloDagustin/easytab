import { describe, expect, it } from 'vitest'
import { detectJumps, sectionMatches } from './jumps'

describe('instruções de salto', () => {
  it('reconhece "repete o refrão", "volta pra intro" e quantidade', () => {
    expect(detectJumps(['Repete o refrão 2x'])).toEqual([{ target: 'refrao', label: 'refrão', times: 2 }])
    expect(detectJumps(['(volta pra intro)'])).toEqual([{ target: 'intro', label: 'intro', times: 1 }])
    expect(detectJumps(['Tocar o solo 2 de novo'])[0]).toMatchObject({ target: 'solo 2' })
    expect(detectJumps(['tocar de novo o riff 2'])[0]).toMatchObject({ target: 'riff 2' })
  })

  it('reconhece volta ao início e D.C.', () => {
    expect(detectJumps(['Volta ao início'])[0]).toMatchObject({ target: 'start' })
    expect(detectJumps(['D.C.'])[0]).toMatchObject({ target: 'start' })
  })

  it('ignora letra de música e instruções sem seção', () => {
    expect(detectJumps(["Sweet child o' mine", '2X REPETIR', '* 2 VEZES SEGUIDAS *'])).toEqual([])
  })

  it('casa o nome da seção sem confundir pré-refrão com refrão', () => {
    expect(sectionMatches('[Primeiro Refrão]', 'refrao')).toBe(true)
    expect(sectionMatches('[Pré-refrão]', 'refrao')).toBe(false)
    expect(sectionMatches('[Riff 2]', 'riff 2')).toBe(true)
    expect(sectionMatches('[Riff 1]', 'riff 2')).toBe(false)
  })
})
