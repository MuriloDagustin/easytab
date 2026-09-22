import type { Note, ParseResult, ParsedTab, StringNumber, TabBlock, TabEvent, Technique } from './types'

// Rótulo opcional, separador opcional, corpo feito de hífens, dígitos, técnicas e barras.
const TAB_LINE = /^\s*([eEBGDA])?\s*[:]?\s*(\|?)([-0-9~/\\hpbrxXtT|().\s]*)$/
// Linha de tab: dois hífens seguidos, ou pelo menos três espalhados (ex.: "-12-12-12-|").
const BODY_HAS_DASHES = /-{2,}|-[^-]*-[^-]*-/
const CHORD_TOKEN = /^[A-G](#|b)?(m|maj|min|dim|aug|sus|add|M|\+|°|º)?\d{0,2}(\/[A-G](#|b)?)?$/
const PALM_MUTE_LINE = /^\s*(P\.?M\.?)[\s\-|.]*$/i
const LABEL_TO_STRING: Record<string, StringNumber> = { e: 1, B: 2, G: 3, D: 4, A: 5, E: 6 }
const LINK_TECHNIQUES: Record<string, Technique> = {
  h: 'hammer-on',
  p: 'pull-off',
  '/': 'slide-up',
  '\\': 'slide-down',
  b: 'bend',
  r: 'release',
  t: 'tapping',
  T: 'tapping',
}

interface RawLine {
  text: string
  label: string | null
  bodyOffset: number
  body: string
  repeat?: number
}

const REPEAT_SUFFIX = /\s+(?:[xX×]\s*(\d{1,2})|(\d{1,2})\s*[xX×])\s*$/
const HEADING_REPEAT = /(?:^|[\s*(])(\d{1,2})\s*(?:[xX×]|vezes)(?=$|[\s*).,:])|(?:^|[\s(])[xX×]\s*(\d{1,2})(?=$|[\s).])/i
const MAX_REPEAT = 8

interface Decoration {
  chordLine?: string
  palmMuteRanges: Array<[number, number]>
}

function matchLine(original: string): RawLine | null {
  const suffix = REPEAT_SUFFIX.exec(original)
  const text = suffix ? original.slice(0, suffix.index) : original
  const m = TAB_LINE.exec(text)
  if (!m) return null
  const [, label, , body] = m
  if (!BODY_HAS_DASHES.test(body)) return null
  const line: RawLine = { text, label: label ?? null, bodyOffset: text.length - body.length, body }
  const count = suffix ? Number(suffix[1] ?? suffix[2]) : 0
  if (count >= 2 && count <= MAX_REPEAT) line.repeat = count
  return line
}

function isChordLine(text: string): boolean {
  const tokens = text.trim().split(/\s+/)
  return tokens.length > 0 && tokens.every((t) => CHORD_TOKEN.test(t))
}

/** Encontra trechos "PM-----" e devolve os intervalos de colunas (relativos ao texto). */
function palmMuteRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  const re = /P\.?M\.?[-.\s]*/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    ranges.push([m.index, m.index + m[0].trimEnd().length])
  }
  return ranges
}

interface Group {
  lines: RawLine[]
  /** Última linha de texto logo acima do bloco (candidata a cifras ou PM). */
  above: string | null
  below: string | null
  /** Todo o texto livre entre o bloco anterior e este: títulos de seção, observações. */
  heading: string[]
}

function groupLines(lines: string[]): Group[] {
  const groups: Group[] = []
  let current: RawLine[] = []
  let pendingText: string[] = []

  const flush = (below: string | null) => {
    if (current.length) {
      groups.push({ lines: current, above: pendingText.at(-1) ?? null, below, heading: pendingText })
    }
    current = []
    pendingText = []
  }

  for (const line of lines) {
    const raw = matchLine(line)
    if (raw) {
      current.push(raw)
      continue
    }
    if (current.length) flush(line.trim() ? line : null)
    if (line.trim()) pendingText.push(line)
  }
  flush(null)
  return groups
}

const MAX_HEADING = 160
const SECTION_MARKER = /^\s*(\[.+\]|Parte \d+ de \d+|\d+[ºª°]? ?[A-ZÀ-Ú][A-ZÀ-Ú ]{2,}|\*.+\*)\s*/

/**
 * Texto livre acima do bloco, sem a linha de cifras/PM, compactado em uma frase.
 * Quando há marcadores de seção ("[Solo 1]", "Parte 2 de 6", "2º RIFF"), só eles
 * entram; assim a letra da música que vem antes não engole o título.
 */
interface HeadingInfo {
  heading?: string
  sectionStart: boolean
  sectionRepeat?: number
}

function headingFor(group: Group, decoration: Decoration): HeadingInfo {
  const lines = group.heading.filter((l) => l !== decoration.chordLine && !PALM_MUTE_LINE.test(l))
  const clean = (l: string) => l.replace(/\\/g, '').replace(/\s+/g, ' ').trim()
  const markers = lines.filter((l) => SECTION_MARKER.test(l)).map(clean)
  const repeats = lines
    .map((l) => HEADING_REPEAT.exec(l))
    .map((m) => (m ? Number(m[1] ?? m[2]) : 0))
    .filter((n) => n >= 2 && n <= MAX_REPEAT)
  const info: HeadingInfo = { sectionStart: markers.length > 0 || repeats.length > 0 }
  if (repeats.length) info.sectionRepeat = Math.max(...repeats)
  const text = (markers.length ? markers : lines.map(clean)).filter(Boolean).join(' ')
  if (text) info.heading = text.length > MAX_HEADING ? `${text.slice(0, MAX_HEADING - 1)}…` : text
  return info
}

function orderByLabels(lines: RawLine[]): RawLine[] {
  const labels = lines.map((l) => l.label)
  if (labels.some((l) => l === null)) return lines
  if (new Set(labels).size !== 6) return lines
  return [...lines].sort((a, b) => LABEL_TO_STRING[a.label!] - LABEL_TO_STRING[b.label!])
}

function normalizeBodies(lines: RawLine[]): { bodies: string[]; length: number } {
  const stripped = lines.map((l) => l.body.replace(/\s+$/, ''))
  const length = Math.max(...stripped.map((b) => b.length))
  // Espaços e pontos ("..." de "continua") são só preenchimento.
  const bodies = stripped.map((b) => b.replace(/[\s.]/g, '-').padEnd(length, '-'))
  return { bodies, length }
}

function readDigits(body: string, from: number): { fret: number; length: number } | null {
  let end = from
  while (end < body.length && /\d/.test(body[end])) end++
  if (end === from) return null
  const fret = Number(body.slice(from, end))
  return fret > 24 ? null : { fret, length: end - from }
}

function decorationsFor(group: Group, bodyOffset: number): Decoration {
  const decoration: Decoration = { palmMuteRanges: [] }
  for (const candidate of [group.above, group.below]) {
    if (!candidate) continue
    if (PALM_MUTE_LINE.test(candidate) || /P\.?M\.?[-.]{2,}/i.test(candidate)) {
      decoration.palmMuteRanges.push(
        ...palmMuteRanges(candidate).map(([a, b]) => [a - bodyOffset, b - bodyOffset] as [number, number]),
      )
    } else if (candidate === group.above && isChordLine(candidate)) {
      decoration.chordLine = candidate
    }
  }
  return decoration
}

function assignChords(chordLine: string | undefined, bodyOffset: number, events: TabEvent[]): void {
  if (!chordLine || !events.length) return
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(chordLine))) {
    const textColumn = m.index
    let best: TabEvent | null = null
    let bestDistance = Infinity
    for (const event of events) {
      if (event.chord) continue
      const distance = Math.abs(bodyOffset + event.column - textColumn)
      if (distance < bestDistance) {
        best = event
        bestDistance = distance
      }
    }
    if (best && bestDistance <= 4) best.chord = m[0]
  }
}

function parseBlock(
  group: Group,
  blockIndex: number,
  nextId: () => number,
  warnings: Set<string>,
): { block: TabBlock; events: TabEvent[] } {
  const ordered = orderByLabels(group.lines)
  const { bodies, length } = normalizeBodies(ordered)
  const bodyOffset = ordered[0].bodyOffset
  const decoration = decorationsFor(group, bodyOffset)
  const events: TabEvent[] = []
  const pendingArrival: (Technique | undefined)[] = Array(6).fill(undefined)

  const isPalmMuted = (col: number) => decoration.palmMuteRanges.some(([a, b]) => col >= a && col < b)

  for (let col = 0; col < length; col++) {
    const notes: Note[] = []
    let width = 1
    for (let s = 0; s < 6; s++) {
      const body = bodies[s]
      const ch = body[col]
      const string = (s + 1) as StringNumber

      if (ch === 'x' || ch === 'X') {
        notes.push({ string, fret: 0, techniques: [], muted: true, palmMute: isPalmMuted(col) || undefined })
        continue
      }
      if (!/\d/.test(ch) || (col > 0 && /\d/.test(body[col - 1]))) continue
      const digits = readDigits(body, col)
      if (!digits) continue

      const note: Note = { string, fret: digits.fret, techniques: [] }
      if (isPalmMuted(col)) note.palmMute = true
      if (pendingArrival[s]) {
        note.arrivedBy = pendingArrival[s]
        pendingArrival[s] = undefined
      }

      let cursor = col + digits.length
      while (cursor < length) {
        const t = body[cursor]
        if (t === '~') {
          if (!note.techniques.includes('vibrato')) note.techniques.push('vibrato')
          cursor++
          continue
        }
        const link = LINK_TECHNIQUES[t]
        if (link) {
          note.techniques.push(link)
          const target = readDigits(body, cursor + 1)
          if (target) {
            note.targetFret = target.fret
            pendingArrival[s] = link
          }
        }
        break
      }

      width = Math.max(width, digits.length)
      notes.push(note)
    }
    if (notes.length) {
      events.push({ id: nextId(), blockIndex, column: col, width, notes })
    }
  }
  assignChords(decoration.chordLine, bodyOffset, events)

  if (events.length && events.every((e) => e.notes.every((n) => n.muted))) {
    warnings.add('Um bloco só tem cordas abafadas ("x"), sem notas para ouvir.')
  }

  const block: TabBlock = {
    index: blockIndex,
    lines: ordered.map((l) => l.text),
    bodyOffsets: ordered.map((l) => l.bodyOffset),
    bodyLength: length,
  }
  if (decoration.chordLine) block.chordLine = decoration.chordLine
  const info = headingFor(group, decoration)
  if (info.heading) block.heading = info.heading
  if (info.sectionStart) block.sectionStart = true
  if (info.sectionRepeat) block.sectionRepeat = info.sectionRepeat
  const lineRepeat = Math.max(0, ...ordered.map((l) => l.repeat ?? 0))
  if (lineRepeat) block.repeat = lineRepeat
  return { block, events }
}

export function parseTab(input: string): ParseResult {
  // Sites e editores trocam hífen por travessão; em tab eles significam a mesma coisa.
  const text = input.replace(/\r\n?/g, '\n').replace(/[\u2013\u2014\u2012\u2010]/g, '-')
  if (!text.trim()) {
    return { ok: false, error: 'Cole uma tablatura antes de processar.' }
  }

  const groups = groupLines(text.split('\n'))
  const warnings = new Set<string>()
  const blocksRaw: Group[] = []
  for (const group of groups) {
    if (group.lines.length % 6 === 0) {
      for (let i = 0; i < group.lines.length; i += 6) {
        blocksRaw.push({
          lines: group.lines.slice(i, i + 6),
          above: i === 0 ? group.above : null,
          below: i + 6 === group.lines.length ? group.below : null,
          heading: i === 0 ? group.heading : [],
        })
      }
    } else {
      warnings.add(
        `Um trecho com ${group.lines.length} linha(s) foi ignorado: cada bloco precisa ter exatamente 6 cordas.`,
      )
    }
  }

  if (!blocksRaw.length) {
    return {
      ok: false,
      error:
        'Não encontrei um bloco de 6 cordas. Cada bloco precisa ter 6 linhas seguidas, uma por corda, com hífens e números (ex.: "e|--3--5--|").',
    }
  }

  let id = 0
  const nextId = () => id++
  const events: TabEvent[] = []
  const blocks: TabBlock[] = []
  blocksRaw.forEach((group, index) => {
    const parsed = parseBlock(group, index, nextId, warnings)
    blocks.push(parsed.block)
    events.push(...parsed.events)
  })

  if (!events.length) {
    return {
      ok: false,
      error: 'A tablatura foi reconhecida, mas não tem nenhuma nota (número) para tocar.',
    }
  }

  const tab: ParsedTab = { events, blocks, warnings: [...warnings] }
  return { ok: true, tab }
}
