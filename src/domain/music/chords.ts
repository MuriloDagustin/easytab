/** Trastes da corda 6 (grave) até a 1 (aguda); null = corda não tocada. */
export type Frets = Array<number | null>

export interface ChordShape {
  name: string
  frets: Frets
  fingers: Array<number | null>
  /** Casa mostrada no topo do diagrama (1 = pestana do braço). */
  baseFret: number
  barre?: { fret: number; fromString: number; toString: number }
  /** Alguma nota da cifra ficou de fora para caber na mão. */
  simplified: boolean
}

export interface ParsedChord {
  root: number
  bass: number
  /** Intervalos a partir da tônica que precisam soar. */
  required: number[]
  /** Intervalos que podem ficar de fora (a quinta justa). */
  optional: number[]
  /** Extensões que podem sair se não couber (9, 11, 13). */
  extensions: number[]
  power: boolean
}

const PITCH: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const TOKEN = /maj9|maj7|7M|M7|dim7|dim|°7|º7|°|º|ø|aug|sus2|sus4|sus|add9|add2|add11|6\/9|69|m7b5|b5|#5|b9|#9|#11|b13|13|11|9|7|6|5|4|2|\+/g

function pc(letter: string, accidental: string): number {
  return (PITCH[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) + 12) % 12
}

export function parseChordName(name: string): ParsedChord | null {
  const m = /^([A-G])([#b]?)(.*?)(?:\/([A-G])([#b]?))?$/.exec(name.trim())
  if (!m) return null
  const [, letter, accidental, rawSuffix, bassLetter, bassAccidental] = m
  const root = pc(letter, accidental)
  let suffix = rawSuffix.replace(/[()\s]/g, '')
  const minor = /^(m(?!aj)|min|-)/.exec(suffix)
  if (minor) suffix = suffix.slice(minor[0].length)

  let third: number | null = minor ? 3 : 4
  let fifth = 7
  let fifthAltered = false
  let seventh: number | null = null
  const extensions = new Set<number>()
  const added = new Set<number>()
  let power = false

  const tokens: string[] = suffix.match(TOKEN) ?? []
  if (tokens.join('') !== suffix.replace(/^M$/, '')) {
    if (suffix !== '' && suffix !== 'M' && suffix !== 'maj') return null
  }
  for (const t of tokens) {
    switch (t) {
      case 'maj7': case '7M': case 'M7': seventh = 11; break
      case 'maj9': seventh = 11; extensions.add(2); break
      case 'dim': case '°': case 'º': third = 3; fifth = 6; fifthAltered = true; break
      case 'dim7': case '°7': case 'º7': third = 3; fifth = 6; fifthAltered = true; seventh = 9; break
      case 'ø': case 'm7b5': third = 3; fifth = 6; fifthAltered = true; seventh = 10; break
      case 'aug': case '+': case '#5': fifth = 8; fifthAltered = true; break
      case 'b5': fifth = 6; fifthAltered = true; break
      case 'sus2': case '2': third = 2; break
      case 'sus4': case 'sus': case '4': third = 5; break
      case 'add9': case 'add2': added.add(2); break
      case 'add11': added.add(5); break
      case '6': added.add(9); break
      case '6/9': case '69': added.add(9); extensions.add(2); break
      case '7': seventh ??= 10; break
      case '9': seventh ??= 10; extensions.add(2); break
      case '11': seventh ??= 10; extensions.add(5); break
      case '13': seventh ??= 10; extensions.add(9); break
      case 'b9': extensions.add(1); break
      case '#9': extensions.add(3); break
      case '#11': extensions.add(6); break
      case 'b13': extensions.add(8); break
      case '5': if (tokens.length === 1 && !minor) { power = true; third = null } break
    }
  }

  const required = new Set<number>([0])
  if (third !== null) required.add(third)
  if (seventh !== null) required.add(seventh)
  added.forEach((i) => required.add(i))
  if (fifthAltered || power) required.add(fifth)
  const bass = bassLetter ? pc(bassLetter, bassAccidental) : root
  return {
    root,
    bass,
    required: [...required],
    optional: fifthAltered || power ? [] : [fifth],
    extensions: [...extensions].filter((e) => !required.has(e)),
    power,
  }
}

const STANDARD = [40, 45, 50, 55, 59, 64]

// Formas abertas clássicas para afinação padrão, com a digitação usual.
const OPEN: Array<[string, string, string]> = [
  ['C', 'x32010', '-32-1-'], ['D', 'xx0232', '---132'], ['E', '022100', '-231--'], ['G', '320003', '21---3'],
  ['A', 'x02220', '--123-'], ['Am', 'x02210', '--231-'], ['Em', '022000', '-23---'], ['Dm', 'xx0231', '---231'],
  ['A7', 'x02020', '--1-2-'], ['D7', 'xx0212', '---213'], ['E7', '020100', '-2-1--'], ['G7', '320001', '32---1'],
  ['C7', 'x32310', '-3241-'], ['B7', 'x21202', '-213-4'], ['Am7', 'x02010', '--2-1-'], ['Em7', '020000', '-2----'],
  ['Dm7', 'xx0211', '---211'], ['Cmaj7', 'x32000', '-32---'], ['Amaj7', 'x02120', '--213-'], ['Dmaj7', 'xx0222', '---111'],
  ['Fmaj7', 'xx3210', '--321-'], ['Dsus4', 'xx0233', '---134'], ['Dsus2', 'xx0230', '---13-'], ['Asus4', 'x02230', '--123-'],
  ['Asus2', 'x02200', '--12--'], ['Esus4', '022200', '-234--'], ['E5', '022xxx', '-12---'], ['A5', 'x022xx', '--12--'],
  ['D5', 'xx023x', '---13-'], ['G/B', 'x20003', '-1---3'], ['C/G', '332010', '342-1-'], ['D/F#', '200232', '1--243'],
]

const toFrets = (s: string): Frets => [...s].map((c) => (c === 'x' ? null : Number(c)))
const toFingers = (s: string) => [...s].map((c) => (c === '-' ? null : Number(c)))

// Formas móveis clássicas (afinação padrão): deslocamentos a partir da casa da tônica.
type Template = { rootString: 0 | 1; offsets: Frets; fingers: Array<number | null> }
const T = (rootString: 0 | 1, offsets: Frets, fingers: string): Template => ({ rootString, offsets, fingers: toFingers(fingers) })
const TEMPLATES: Template[] = [
  T(0, [0, 2, 2, 1, 0, 0], '134211'), T(0, [0, 2, 2, 0, 0, 0], '134111'), T(0, [0, 2, 0, 1, 0, 0], '131211'),
  T(0, [0, 2, 0, 0, 0, 0], '131111'), T(0, [0, null, 1, 1, 0, null], '1-342-'), T(0, [0, 2, 2, 2, 0, 0], '123411'),
  T(0, [0, 2, 2, null, null, null], '134---'), T(0, [0, 2, 0, 2, 0, 0], '131411'),
  T(1, [null, 0, 2, 2, 2, 0], '-13331'), T(1, [null, 0, 2, 2, 1, 0], '-13421'), T(1, [null, 0, 2, 0, 2, 0], '-13141'),
  T(1, [null, 0, 2, 0, 1, 0], '-13121'), T(1, [null, 0, 2, 1, 2, 0], '-13241'), T(1, [null, 0, 2, 2, 0, 0], '-13411'),
  T(1, [null, 0, 2, 2, 3, 0], '-12341'), T(1, [null, 0, 2, 2, null, null], '-134--'), T(1, [null, 0, 2, 0, 3, 0], '-13141'),
  T(1, [null, 0, 1, 2, 1, null], '-1243-'), T(1, [null, 0, 1, 0, 1, null], '-1324-'), T(1, [null, 0, -1, 0, 0, 0], '-21333'),
  T(1, [null, 0, 2, 2, 2, 2], '-13333'), T(1, [null, 0, -2, 0, 0, 0], '-21333'),
]

function fromTemplates(chord: ParsedChord): { frets: Frets; fingers: Array<number | null> } | null {
  const allowed = new Set([...chord.required, ...chord.optional, ...chord.extensions].map((i) => (i + chord.root) % 12))
  const needed = [...chord.required, ...chord.extensions].map((i) => (i + chord.root) % 12)
  let best: { frets: Frets; fingers: Array<number | null>; base: number } | null = null
  for (const t of TEMPLATES) {
    if (chord.bass !== chord.root) continue
    const open = STANDARD[t.rootString]
    let r = (chord.root - open + 120) % 12
    const minOffset = Math.min(...t.offsets.filter((o): o is number => o !== null))
    if (r + minOffset < 1) r += 12
    const frets = t.offsets.map((o) => (o === null ? null : o + r))
    const pcs = frets.map((f, i) => (f === null ? null : (STANDARD[i] + f) % 12)).filter((p): p is number => p !== null)
    if (!pcs.every((p) => allowed.has(p)) || !needed.every((p) => pcs.includes(p))) continue
    const base = Math.min(...frets.filter((f): f is number => f !== null))
    if (!best || base < best.base) best = { frets, fingers: t.fingers, base }
  }
  return best
}


function sameChord(a: ParsedChord, b: ParsedChord): boolean {
  const key = (c: ParsedChord) => `${c.root}/${c.bass}/${[...c.required].sort().join(',')}/${[...c.extensions].sort().join(',')}/${c.power}`
  return key(a) === key(b)
}

function baseFretOf(frets: Frets): number {
  const pressed = frets.filter((f): f is number => f !== null && f > 0)
  const max = Math.max(0, ...pressed)
  return max <= 4 ? 1 : Math.min(...pressed)
}

function withBarre(shape: Omit<ChordShape, 'barre'>): ChordShape {
  const ones = shape.fingers.map((f, i) => (f === 1 ? i : -1)).filter((i) => i >= 0)
  if (ones.length < 2) return shape
  const fret = shape.frets[ones[0]]
  if (fret === null || fret === 0 || !ones.every((i) => shape.frets[i] === fret)) return shape
  return { ...shape, barre: { fret, fromString: 6 - ones[0], toString: 6 - ones.at(-1)! } }
}

/**
 * Dedos para uma forma: pestana com o indicador quando a menor casa aparece em mais de
 * uma corda e nenhuma corda solta fica no meio; o resto em ordem de casa.
 */
export function assignFingers(frets: Frets): Array<number | null> | null {
  const fretted = frets.map((f, i) => ({ f, i })).filter((x): x is { f: number; i: number } => x.f !== null && x.f > 0)
  if (!fretted.length) return frets.map(() => null)
  const min = Math.min(...fretted.map((x) => x.f))
  const atMin = fretted.filter((x) => x.f === min)
  const fingers: Array<number | null> = frets.map(() => null)
  let rest = fretted
  let next = 1
  if (atMin.length > 1) {
    const from = atMin[0].i
    const to = atMin.at(-1)!.i
    const barreOk = frets.slice(from, to + 1).every((f) => f !== null && f >= min)
    if (!barreOk) return null
    atMin.forEach((x) => (fingers[x.i] = 1))
    rest = fretted.filter((x) => x.f !== min)
    next = 2
  }
  for (const x of [...rest].sort((a, b) => a.f - b.f || a.i - b.i)) {
    if (next > 4) return null
    fingers[x.i] = next++
  }
  return fingers
}

interface Candidate {
  frets: Frets
  fingers: Array<number | null>
  score: number
}

function search(chord: ParsedChord, tuning: number[], tones: number[], mustHave: number[], minSounding: number): Candidate | null {
  const toneSet = new Set([...tones.map((t) => (t + chord.root) % 12), chord.bass])
  const must = mustHave.map((t) => (t + chord.root) % 12)
  const maxSounding = chord.power ? 3 : 6
  let best: Candidate | null = null

  for (let base = 0; base <= 12; base++) {
    const low = Math.max(1, base)
    const options = tuning.map((open) => {
      const list: Array<number | null> = [null]
      if (toneSet.has(open % 12)) list.push(0)
      for (let f = low; f <= low + 3; f++) if (toneSet.has((open + f) % 12)) list.push(f)
      return list
    })

    const current: Frets = []
    const visit = (s: number) => {
      if (s === 6) {
        evaluate([...current])
        return
      }
      const started = current.some((f) => f !== null)
      for (const option of options[s]) {
        if (option === null && started) {
          // Cordas tocadas precisam ser vizinhas: depois de uma muda acima do acorde, as demais ficam mudas.
          evaluate([...current, ...new Array(6 - s).fill(null)])
          continue
        }
        current.push(option)
        visit(s + 1)
        current.pop()
      }
    }

    const evaluate = (frets: Frets) => {
      const sounding = frets.map((f, i) => (f === null ? null : (tuning[i] + f) % 12))
      const idx = sounding.map((p, i) => (p === null ? -1 : i)).filter((i) => i >= 0)
      if (idx.length < minSounding || idx.length > maxSounding) return
      if (sounding[idx[0]] !== chord.bass) return
      const present = new Set(sounding.filter((p): p is number => p !== null))
      if (!must.every((p) => present.has(p))) return
      const pressed = frets.filter((f): f is number => f !== null && f > 0)
      if (pressed.length && Math.max(...pressed) - Math.min(...pressed) > 3) return
      const fingers = assignFingers(frets)
      if (!fingers) return
      const fingerCount = new Set(fingers.filter((f) => f !== null)).size
      const opens = frets.filter((f) => f === 0).length
      const minPressed = pressed.length ? Math.min(...pressed) : 0
      const maxPressed = pressed.length ? Math.max(...pressed) : 0
      const span = pressed.length ? maxPressed - minPressed : 0
      const barre = fingers.filter((f) => f === 1).length > 1
      let score = minPressed * 1.2 - idx.length * 2.5 + fingerCount * 0.4 + span * 0.8 + (barre ? 0.5 : 0)
      score += maxPressed <= 3 ? -opens * 0.6 : opens * 1.5
      if (!best || score < best.score) best = { frets, fingers, score }
    }

    visit(0)
  }
  return best
}

const shapeCache = new Map<string, ChordShape | null>()

/**
 * Forma de acorde para a afinação dada. Na afinação padrão usa as formas abertas
 * clássicas quando existem; nos outros casos procura no braço a forma mais simples
 * que tenha todas as notas da cifra, com o baixo certo e até quatro dedos.
 */
export function chordShape(name: string, tuning: number[] = STANDARD): ChordShape | null {
  const cacheKey = `${name}@${tuning.join(',')}`
  if (shapeCache.has(cacheKey)) return shapeCache.get(cacheKey)!
  const result = computeShape(name, tuning)
  shapeCache.set(cacheKey, result)
  return result
}

function computeShape(name: string, tuning: number[]): ChordShape | null {
  const chord = parseChordName(name)
  if (!chord) return null
  const standard = tuning.every((m, i) => m === STANDARD[i])
  if (standard) {
    const open = OPEN.find(([n]) => {
      const other = parseChordName(n)
      return other !== null && sameChord(other, chord)
    })
    if (open) {
      const frets = toFrets(open[1])
      return withBarre({ name, frets, fingers: toFingers(open[2]), baseFret: baseFretOf(frets), simplified: false })
    }
  }

  const all = [...chord.required, ...chord.optional, ...chord.extensions]
  const withExtensions = [...chord.required, ...chord.extensions]
  const min = chord.power ? 2 : 4

  if (standard) {
    const template = fromTemplates(chord)
    if (template) {
      const templateBase = Math.min(...template.frets.filter((f): f is number => f !== null))
      const lower = templateBase >= 7 ? search(chord, tuning, all, withExtensions, min) : null
      const lowerBase = lower ? Math.min(...lower.frets.filter((f): f is number => f !== null && f > 0), 99) : 99
      if (!lower || lowerBase > templateBase - 3) {
        return withBarre({ name, ...template, baseFret: baseFretOf(template.frets), simplified: false })
      }
    }
  }

  const full = search(chord, tuning, all, withExtensions, min) ?? search(chord, tuning, all, withExtensions, 3)
  const found = full ?? search(chord, tuning, all, chord.required, min) ?? search(chord, tuning, all, chord.required, 3)
  if (!found) return null
  return withBarre({
    name,
    frets: found.frets,
    fingers: found.fingers,
    baseFret: baseFretOf(found.frets),
    simplified: !full,
  })
}

/** Classes de altura da cifra, para pesar na detecção de tonalidade. */
export function chordPitchClasses(name: string): number[] {
  const chord = parseChordName(name)
  if (!chord) return []
  return [...chord.required, ...chord.optional].map((i) => (i + chord.root) % 12)
}
