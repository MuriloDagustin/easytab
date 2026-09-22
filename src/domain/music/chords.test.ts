import { describe, expect, it } from 'vitest'
import { chordShape, parseChordName } from './chords'

describe('parseChordName', () => {
  it('reconhece tônica, acidente e qualidade', () => {
    expect(parseChordName('F#m')).toMatchObject({ pitch: 6, quality: 'minor', simplified: false })
    expect(parseChordName('Bb5')).toMatchObject({ pitch: 10, quality: '5' })
    expect(parseChordName('C7M')).toMatchObject({ quality: 'maj7' })
  })

  it('simplifica extensões e baixo invertido', () => {
    expect(parseChordName('A7(9)')).toMatchObject({ quality: '7', simplified: true })
    expect(parseChordName('G/B')).toMatchObject({ quality: 'major', simplified: true })
  })

  it('rejeita o que não é cifra', () => {
    expect(parseChordName('Verso')).toBeNull()
  })
})

describe('chordShape', () => {
  it('usa a forma aberta quando existe', () => {
    expect(chordShape('C')).toMatchObject({ frets: [null, 3, 2, 0, 1, 0], baseFret: 1 })
    expect(chordShape('Em')?.frets).toEqual([0, 2, 2, 0, 0, 0])
  })

  it('gera pestana para acordes sem forma aberta', () => {
    const f = chordShape('F')!
    expect(f.frets).toEqual([1, 3, 3, 2, 1, 1])
    expect(f.barre).toEqual({ fret: 1, fromString: 6, toString: 1 })
    const bm = chordShape('Bm')!
    expect(bm.frets).toEqual([null, 2, 4, 4, 3, 2])
    expect(bm.baseFret).toBe(1)
  })

  it('escolhe a posição mais baixa entre as formas E e A', () => {
    expect(chordShape('D#5')?.frets).toEqual([null, 6, 8, 8, null, null])
    expect(chordShape('G5')?.frets).toEqual([3, 5, 5, null, null, null])
  })

  it('mostra a casa inicial quando a forma é alta', () => {
    expect(chordShape('C#m')?.baseFret).toBe(4)
  })
})
