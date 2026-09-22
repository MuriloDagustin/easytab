import { keyAlterations, spellPitch } from './keys'

// Guitarra se escreve uma oitava acima do som real, na clave de sol.
const WRITTEN_OFFSET = 12
// E4 fica na primeira linha da pauta.
const BOTTOM_LINE_DIATONIC = 4 * 7 + 2

export type Accidental = 'sharp' | 'flat' | 'natural'

export interface StaffNote {
  /** Posição na pauta em meias-linhas: 0 = primeira linha, 8 = quinta linha. */
  step: number
  /** Acidente a desenhar, só quando a nota foge da armadura. */
  accidental: Accidental | null
  /** Linhas suplementares necessárias, em posições de step. */
  ledgers: number[]
}

export function staffNote(soundingMidi: number, fifths = 0): StaffNote {
  const midi = soundingMidi + WRITTEN_OFFSET
  const { letter, alter } = spellPitch(midi % 12, fifths)
  const octave = Math.floor((midi - alter) / 12) - 1
  const step = octave * 7 + letter - BOTTOM_LINE_DIATONIC
  const keyAlter = keyAlterations(fifths)[letter]
  const accidental: Accidental | null =
    alter === keyAlter ? null : alter === 1 ? 'sharp' : alter === -1 ? 'flat' : 'natural'
  const ledgers: number[] = []
  for (let s = -2; s >= step; s -= 2) ledgers.push(s)
  for (let s = 10; s <= step; s += 2) ledgers.push(s)
  return { step, accidental, ledgers }
}

export type NoteHead = 'whole' | 'half' | 'black'

export interface NoteValue {
  head: NoteHead
  stem: boolean
  flags: number
  dotted: boolean
  name: string
}

const VALUES: Array<[number, NoteValue]> = [
  [4, { head: 'whole', stem: false, flags: 0, dotted: false, name: 'semibreve' }],
  [3, { head: 'half', stem: true, flags: 0, dotted: true, name: 'mínima pontuada' }],
  [2, { head: 'half', stem: true, flags: 0, dotted: false, name: 'mínima' }],
  [1.5, { head: 'black', stem: true, flags: 0, dotted: true, name: 'semínima pontuada' }],
  [1, { head: 'black', stem: true, flags: 0, dotted: false, name: 'semínima' }],
  [0.75, { head: 'black', stem: true, flags: 1, dotted: true, name: 'colcheia pontuada' }],
  [0.5, { head: 'black', stem: true, flags: 1, dotted: false, name: 'colcheia' }],
  [0.25, { head: 'black', stem: true, flags: 2, dotted: false, name: 'semicolcheia' }],
]

/** Figura mais próxima de uma duração em semínimas (1 = semínima). */
export function noteValue(quarters: number): NoteValue {
  let best = VALUES[4][1]
  let bestDistance = Infinity
  for (const [q, value] of VALUES) {
    const distance = Math.abs(Math.log2(Math.max(quarters, 0.01)) - Math.log2(q))
    if (distance < bestDistance) {
      best = value
      bestDistance = distance
    }
  }
  return best
}
