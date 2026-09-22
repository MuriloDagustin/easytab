// Guitarra se escreve uma oitava acima do som real, na clave de sol.
const WRITTEN_OFFSET = 12
// Letra (0 = C ... 6 = B) e sustenido para cada classe de altura.
const SPELLING: Array<[number, boolean]> = [
  [0, false], [0, true], [1, false], [1, true], [2, false], [3, false],
  [3, true], [4, false], [4, true], [5, false], [5, true], [6, false],
]
// E4 fica na primeira linha da pauta.
const BOTTOM_LINE_DIATONIC = 4 * 7 + 2

export interface StaffNote {
  /** Posição na pauta em meias-linhas: 0 = primeira linha, 8 = quinta linha. */
  step: number
  sharp: boolean
  /** Linhas suplementares necessárias, em posições de step. */
  ledgers: number[]
}

export function staffNote(soundingMidi: number): StaffNote {
  const midi = soundingMidi + WRITTEN_OFFSET
  const octave = Math.floor(midi / 12) - 1
  const [letter, sharp] = SPELLING[midi % 12]
  const step = octave * 7 + letter - BOTTOM_LINE_DIATONIC
  const ledgers: number[] = []
  for (let s = -2; s >= step; s -= 2) ledgers.push(s)
  for (let s = 10; s <= step; s += 2) ledgers.push(s)
  return { step, sharp, ledgers }
}
