export interface Key {
  tonic: number
  mode: 'major' | 'minor'
  /** Armadura: positivo = sustenidos, negativo = bemóis. */
  fifths: number
  name: string
}

// Perfis de Krumhansl-Kessler: peso de cada grau numa tonalidade maior e menor.
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

// Armadura da tonalidade maior com tônica em cada classe de altura.
const MAJOR_FIFTHS = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5]

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11]
const PT_LETTERS: Record<string, string> = { C: 'Dó', D: 'Ré', E: 'Mi', F: 'Fá', G: 'Sol', A: 'Lá', B: 'Si' }
const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6]
const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3]

/** Alteração que a armadura aplica em cada letra (0 = C ... 6 = B). */
export function keyAlterations(fifths: number): number[] {
  const alter = [0, 0, 0, 0, 0, 0, 0]
  if (fifths > 0) SHARP_ORDER.slice(0, fifths).forEach((l) => (alter[l] = 1))
  if (fifths < 0) FLAT_ORDER.slice(0, -fifths).forEach((l) => (alter[l] = -1))
  return alter
}

export interface Spelling {
  letter: number
  alter: -1 | 0 | 1
}

/** Grafia de uma classe de altura na tonalidade: nota da escala quando possível. */
export function spellPitch(pc: number, fifths: number): Spelling {
  const keyAlter = keyAlterations(fifths)
  const options: Spelling[] = []
  for (let letter = 0; letter < 7; letter++) {
    for (const alter of [-1, 0, 1] as const) {
      if ((LETTER_PC[letter] + alter + 12) % 12 === pc) options.push({ letter, alter })
    }
  }
  const diatonic = options.find((o) => o.alter === keyAlter[o.letter])
  if (diatonic) return diatonic
  const natural = options.find((o) => o.alter === 0)
  if (natural) return natural
  const preferred = fifths < 0 ? -1 : 1
  return options.find((o) => o.alter === preferred) ?? options[0]
}

function spelledName(pc: number, fifths: number): string {
  const s = spellPitch(pc, fifths)
  return `${PT_LETTERS[LETTERS[s.letter]]}${s.alter === 1 ? '♯' : s.alter === -1 ? '♭' : ''}`
}

function correlation(a: number[], b: number[]): number {
  const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length
  const ma = mean(a)
  const mb = mean(b)
  let num = 0
  let da = 0
  let db = 0
  for (let i = 0; i < 12; i++) {
    num += (a[i] - ma) * (b[i] - mb)
    da += (a[i] - ma) ** 2
    db += (b[i] - mb) ** 2
  }
  return da && db ? num / Math.sqrt(da * db) : 0
}

export function keyOf(tonic: number, mode: 'major' | 'minor'): Key {
  const fifths = mode === 'major' ? MAJOR_FIFTHS[tonic] : MAJOR_FIFTHS[(tonic + 3) % 12]
  return { tonic, mode, fifths, name: `${spelledName(tonic, fifths)} ${mode === 'major' ? 'maior' : 'menor'}` }
}

/**
 * Tonalidade mais provável pelas alturas tocadas (histograma de classes de altura
 * contra os perfis de Krumhansl). Cifras, quando houver, entram como peso extra.
 */
export function detectKey(midis: number[], chordTones: number[] = []): Key {
  const histogram = new Array(12).fill(0)
  midis.forEach((m) => (histogram[((m % 12) + 12) % 12] += 1))
  chordTones.forEach((pc) => (histogram[pc] += 2))
  if (histogram.every((v) => v === 0)) return keyOf(0, 'major')

  let best = keyOf(0, 'major')
  let bestScore = -Infinity
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const [mode, profile] of [['major', MAJOR], ['minor', MINOR]] as const) {
      const rotated = profile.map((_, i) => profile[(i - tonic + 12) % 12])
      const score = correlation(histogram, rotated)
      if (score > bestScore) {
        bestScore = score
        best = keyOf(tonic, mode)
      }
    }
  }
  return best
}

// Posições na pauta (0 = primeira linha, E4) dos acidentes da armadura na clave de sol.
export const SHARP_SIGNATURE_STEPS = [8, 5, 9, 6, 3, 7, 4]
export const FLAT_SIGNATURE_STEPS = [4, 7, 3, 6, 2, 5, 1]
