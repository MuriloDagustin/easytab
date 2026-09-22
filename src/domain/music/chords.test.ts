import { describe, expect, it } from 'vitest'
import { assignFingers, chordPitchClasses, chordShape, parseChordName } from './chords'

const DROP_D = [38, 45, 50, 55, 59, 64]
const DADGAD = [38, 45, 50, 55, 57, 62]

function sounding(frets: Array<number | null>, tuning = [40, 45, 50, 55, 59, 64]): number[] {
  return frets.map((f, i) => (f === null ? -1 : (tuning[i] + f) % 12)).filter((p) => p >= 0)
}

describe('parseChordName', () => {
  it('reconhece tônica, qualidade e baixo', () => {
    expect(parseChordName('F#m')).toMatchObject({ root: 6, bass: 6, required: [0, 3] })
    expect(parseChordName('Bb5')).toMatchObject({ root: 10, power: true, required: [0, 7] })
    expect(parseChordName('G/B')).toMatchObject({ root: 7, bass: 11 })
  })

  it('entende sétimas e extensões', () => {
    expect(parseChordName('C7M')?.required).toContain(11)
    expect(parseChordName('A7(9)')).toMatchObject({ required: [0, 4, 10], extensions: [2] })
    expect(parseChordName('Bm7b5')?.required.sort()).toEqual([0, 10, 3, 6].sort())
    expect(parseChordName('E7(#9)')?.extensions).toEqual([3])
  })

  it('rejeita o que não é cifra', () => {
    expect(parseChordName('Verso')).toBeNull()
    expect(parseChordName('Cxyz')).toBeNull()
  })

  it('lista as classes de altura', () => {
    expect(chordPitchClasses('Am').sort()).toEqual([0, 4, 9])
  })
})

describe('assignFingers', () => {
  it('usa pestana com o indicador', () => {
    expect(assignFingers([1, 3, 3, 2, 1, 1])).toEqual([1, 3, 4, 2, 1, 1])
  })

  it('recusa pestana sobre corda solta e formas com mais de quatro dedos', () => {
    expect(assignFingers([null, 2, 0, 2, null, null])).toBeNull()
    expect(assignFingers([1, 2, 3, 4, 5, null])).toBeNull()
  })
})

describe('chordShape', () => {
  it('usa a forma aberta clássica na afinação padrão', () => {
    expect(chordShape('C')).toMatchObject({ frets: [null, 3, 2, 0, 1, 0], baseFret: 1 })
    expect(chordShape('G/B')?.frets).toEqual([null, 2, 0, 0, 0, 3])
  })

  it('acha pestanas quando não há forma aberta', () => {
    const f = chordShape('F')!
    expect(f.frets).toEqual([1, 3, 3, 2, 1, 1])
    expect(f.barre).toEqual({ fret: 1, fromString: 6, toString: 1 })
    expect(chordShape('Bm')?.frets).toEqual([null, 2, 4, 4, 3, 2])
  })

  it('mostra a casa inicial em formas altas', () => {
    expect(chordShape('C#m')!.baseFret).toBeGreaterThan(1)
  })

  it('monta acordes com extensão sem simplificar quando cabem', () => {
    const shape = chordShape('A7(9)')!
    expect(shape.simplified).toBe(false)
    for (const pc of [9, 1, 7, 11]) expect(sounding(shape.frets)).toContain(pc)
    expect(sounding(shape.frets)[0]).toBe(9)
  })

  it('respeita o baixo invertido fora das formas abertas', () => {
    const shape = chordShape('Am/G')!
    expect(sounding(shape.frets)[0]).toBe(7)
  })

  it('funciona em Drop D e DADGAD', () => {
    expect(chordShape('D5', DROP_D)?.frets).toEqual([0, 0, 0, null, null, null])
    const d = chordShape('D', DADGAD)!
    expect(sounding(d.frets, DADGAD)[0]).toBe(2)
    expect(new Set(sounding(d.frets, DADGAD))).toEqual(new Set([2, 6, 9]))
  })

  it('toda forma gerada tem as notas certas e até quatro dedos', () => {
    for (const name of ['F#m7', 'Ebmaj7', 'C#dim', 'Bb', 'Ab7', 'Gsus4', 'E9', 'Dm6', 'F/C']) {
      const shape = chordShape(name)!
      const parsed = parseChordName(name)!
      const tones = sounding(shape.frets)
      expect(tones[0], name).toBe(parsed.bass)
      for (const i of parsed.required) expect(tones, name).toContain((parsed.root + i) % 12)
      expect(Math.max(0, ...shape.fingers.map((f) => f ?? 0)), name).toBeLessThanOrEqual(4)
    }
  })
})
