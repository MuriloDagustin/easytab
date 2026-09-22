/** Trastes da corda 6 (grave) até a 1 (aguda); null = corda não tocada. */
export type Frets = Array<number | null>

export interface ChordShape {
  name: string
  frets: Frets
  fingers: Array<number | null>
  /** Casa mostrada no topo do diagrama (1 = pestana do braço). */
  baseFret: number
  barre?: { fret: number; fromString: number; toString: number }
  /** Cifra com extensões que o diagrama simplifica (ex.: 7(9) vira 7). */
  simplified: boolean
}

type Quality = 'major' | 'minor' | '7' | 'm7' | 'maj7' | '5' | 'sus2' | 'sus4' | 'dim' | 'aug'

const PITCH: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

function parseFrets(s: string): Frets {
  return [...s].map((c) => (c === 'x' ? null : Number(c)))
}

function parseFingers(s: string): Array<number | null> {
  return [...s].map((c) => (c === '-' ? null : Number(c)))
}

// Formas abertas mais comuns para afinação padrão, com a digitação usual.
const OPEN: Record<string, [string, string]> = {
  'C:major': ['x32010', '-32-1-'],
  'D:major': ['xx0232', '---132'],
  'E:major': ['022100', '-231--'],
  'G:major': ['320003', '21---3'],
  'A:major': ['x02220', '--123-'],
  'A:minor': ['x02210', '--231-'],
  'E:minor': ['022000', '-23---'],
  'D:minor': ['xx0231', '---231'],
  'A:7': ['x02020', '--1-2-'],
  'D:7': ['xx0212', '---213'],
  'E:7': ['020100', '-2-1--'],
  'G:7': ['320001', '32---1'],
  'C:7': ['x32310', '-3241-'],
  'B:7': ['x21202', '-213-4'],
  'A:m7': ['x02010', '--2-1-'],
  'E:m7': ['020000', '-2----'],
  'D:m7': ['xx0211', '---211'],
  'C:maj7': ['x32000', '-32---'],
  'A:maj7': ['x02120', '--213-'],
  'D:maj7': ['xx0222', '---111'],
  'F:maj7': ['xx3210', '--321-'],
  'D:sus4': ['xx0233', '---134'],
  'D:sus2': ['xx0230', '---13-'],
  'A:sus4': ['x02230', '--123-'],
  'A:sus2': ['x02200', '--12--'],
  'E:sus4': ['022200', '-234--'],
  'E:5': ['022xxx', '-12---'],
  'A:5': ['x022xx', '--12--'],
  'D:5': ['xx023x', '---13-'],
}

// Formas móveis relativas à casa da tônica: E com tônica na 6ª corda, A com tônica na 5ª.
const E_SHAPE: Partial<Record<Quality, [Frets, Array<number | null>]>> = {
  major: [[0, 2, 2, 1, 0, 0], [1, 3, 4, 2, 1, 1]],
  minor: [[0, 2, 2, 0, 0, 0], [1, 3, 4, 1, 1, 1]],
  '7': [[0, 2, 0, 1, 0, 0], [1, 3, 1, 2, 1, 1]],
  m7: [[0, 2, 0, 0, 0, 0], [1, 3, 1, 1, 1, 1]],
  maj7: [[0, 2, 1, 1, 0, 0], [1, 4, 2, 3, 1, 1]],
  sus4: [[0, 2, 2, 2, 0, 0], [1, 2, 3, 4, 1, 1]],
  '5': [[0, 2, 2, null, null, null], [1, 3, 4, null, null, null]],
}

const A_SHAPE: Partial<Record<Quality, [Frets, Array<number | null>]>> = {
  major: [[null, 0, 2, 2, 2, 0], [null, 1, 3, 3, 3, 1]],
  minor: [[null, 0, 2, 2, 1, 0], [null, 1, 3, 4, 2, 1]],
  '7': [[null, 0, 2, 0, 2, 0], [null, 1, 3, 1, 4, 1]],
  m7: [[null, 0, 2, 0, 1, 0], [null, 1, 3, 1, 2, 1]],
  maj7: [[null, 0, 2, 1, 2, 0], [null, 1, 3, 2, 4, 1]],
  sus2: [[null, 0, 2, 2, 0, 0], [null, 1, 3, 4, 1, 1]],
  sus4: [[null, 0, 2, 2, 3, 0], [null, 1, 2, 3, 4, 1]],
  '5': [[null, 0, 2, 2, null, null], [null, 1, 3, 4, null, null]],
  dim: [[null, 0, 1, 2, 1, null], [null, 1, 2, 4, 3, null]],
  aug: [[null, 0, 3, 2, 2, 1], [null, 1, 4, 3, 3, 2]],
}

const ROOT_OPEN = { E: 4, A: 9 }

interface ParsedChord {
  root: string
  pitch: number
  quality: Quality
  simplified: boolean
}

export function parseChordName(name: string): ParsedChord | null {
  const m = /^([A-G])([#b]?)([^/]*)(\/[A-G][#b]?)?$/.exec(name.trim())
  if (!m) return null
  const [, letter, accidental, rawSuffix, bass] = m
  const pitch = (PITCH[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) + 12) % 12
  const suffix = rawSuffix.replace(/[()]/g, '')
  const exact: Record<string, Quality> = {
    '': 'major', M: 'major', maj: 'major', m: 'minor', min: 'minor', '-': 'minor',
    '7': '7', m7: 'm7', min7: 'm7', maj7: 'maj7', M7: 'maj7', '7M': 'maj7', '5': '5',
    sus2: 'sus2', sus4: 'sus4', sus: 'sus4', dim: 'dim', '°': 'dim', 'º': 'dim', aug: 'aug', '+': 'aug',
  }
  let quality = exact[suffix]
  let simplified = Boolean(bass)
  if (!quality) {
    simplified = true
    if (/^m7|^min7/.test(suffix)) quality = 'm7'
    else if (/^(maj7|7M|M7)/.test(suffix)) quality = 'maj7'
    else if (/^m(?!aj)/.test(suffix)) quality = 'minor'
    else if (/^7/.test(suffix)) quality = '7'
    else if (/^sus2/.test(suffix)) quality = 'sus2'
    else if (/^sus/.test(suffix)) quality = 'sus4'
    else quality = 'major'
  }
  return { root: `${letter}${accidental}`, pitch, quality, simplified }
}

function withBarre(shape: Omit<ChordShape, 'barre'>): ChordShape {
  const oneStrings = shape.fingers
    .map((f, i) => (f === 1 ? i : -1))
    .filter((i) => i >= 0)
  if (oneStrings.length < 2) return shape
  const fret = shape.frets[oneStrings[0]]
  if (fret === null || fret === 0 || !oneStrings.every((i) => shape.frets[i] === fret)) return shape
  return { ...shape, barre: { fret, fromString: 6 - oneStrings[0], toString: 6 - oneStrings.at(-1)! } }
}

function baseFretOf(frets: Frets): number {
  const pressed = frets.filter((f): f is number => f !== null && f > 0)
  const max = Math.max(0, ...pressed)
  return max <= 4 ? 1 : Math.min(...pressed)
}

/** Forma de acorde para afinação padrão: aberta quando existe, senão pestana na posição mais baixa. */
export function chordShape(name: string): ChordShape | null {
  const parsed = parseChordName(name)
  if (!parsed) return null
  const openKey = Object.keys(OPEN).find((k) => {
    const [root, q] = k.split(':')
    return PITCH[root] === parsed.pitch && q === parsed.quality
  })
  if (openKey) {
    const [frets, fingers] = OPEN[openKey]
    const f = parseFrets(frets)
    return withBarre({ name, frets: f, fingers: parseFingers(fingers), baseFret: baseFretOf(f), simplified: parsed.simplified })
  }

  const candidates: ChordShape[] = []
  for (const [root, table] of [['E', E_SHAPE], ['A', A_SHAPE]] as const) {
    const entry = table[parsed.quality]
    if (!entry) continue
    let offset = (parsed.pitch - ROOT_OPEN[root] + 12) % 12
    if (offset === 0) offset = 12
    const frets = entry[0].map((f) => (f === null ? null : f + offset))
    candidates.push(
      withBarre({ name, frets, fingers: [...entry[1]], baseFret: baseFretOf(frets), simplified: parsed.simplified }),
    )
  }
  if (!candidates.length) return null
  return candidates.sort((a, b) => a.baseFret - b.baseFret)[0]
}
