import type { Note, ParseResult, ParsedTab, StringNumber, TabBlock, TabEvent, Technique } from './types'

// Rótulo opcional, separador opcional, corpo feito de hífens, dígitos, técnicas e barras.
const TAB_LINE = /^\s*([eEBGDA])?\s*[:]?\s*(\|?)([-0-9~/\\hpbrxX|()\s]*)$/
const BODY_HAS_DASHES = /-{2,}/
const LABEL_TO_STRING: Record<string, StringNumber> = { e: 1, B: 2, G: 3, D: 4, A: 5, E: 6 }
const LINK_TECHNIQUES: Record<string, Technique> = {
  h: 'hammer-on',
  p: 'pull-off',
  '/': 'slide-up',
  '\\': 'slide-down',
  b: 'bend',
  r: 'release',
}

interface RawLine {
  text: string
  label: string | null
  bodyOffset: number
  body: string
}

function matchLine(text: string): RawLine | null {
  const m = TAB_LINE.exec(text)
  if (!m) return null
  const [, label, , body] = m
  if (!BODY_HAS_DASHES.test(body)) return null
  return { text, label: label ?? null, bodyOffset: text.length - body.length, body }
}

function groupLines(lines: string[]): RawLine[][] {
  const groups: RawLine[][] = []
  let current: RawLine[] = []
  for (const line of lines) {
    const raw = matchLine(line)
    if (raw) {
      current.push(raw)
    } else if (current.length) {
      groups.push(current)
      current = []
    }
  }
  if (current.length) groups.push(current)
  return groups
}

function orderByLabels(lines: RawLine[]): RawLine[] {
  const labels = lines.map((l) => l.label)
  if (labels.some((l) => l === null)) return lines
  const seen = new Set(labels)
  if (seen.size !== 6) return lines
  return [...lines].sort((a, b) => LABEL_TO_STRING[a.label!] - LABEL_TO_STRING[b.label!])
}

function normalizeBodies(lines: RawLine[]): { bodies: string[]; length: number } {
  const stripped = lines.map((l) => l.body.replace(/\s+$/, ''))
  const length = Math.max(...stripped.map((b) => b.length))
  const bodies = stripped.map((b) => b.replace(/\s/g, '-').padEnd(length, '-'))
  return { bodies, length }
}

function readDigits(body: string, from: number): { fret: number; length: number } | null {
  let end = from
  while (end < body.length && /\d/.test(body[end])) end++
  if (end === from) return null
  const fret = Number(body.slice(from, end))
  return fret > 24 ? null : { fret, length: end - from }
}

function parseBlock(
  raw: RawLine[],
  blockIndex: number,
  nextId: () => number,
  warnings: Set<string>,
): { block: TabBlock; events: TabEvent[] } {
  const ordered = orderByLabels(raw)
  const { bodies, length } = normalizeBodies(ordered)
  const events: TabEvent[] = []
  const pendingArrival: (Technique | undefined)[] = Array(6).fill(undefined)

  for (let col = 0; col < length; col++) {
    const notes: Note[] = []
    let width = 1
    for (let s = 0; s < 6; s++) {
      const body = bodies[s]
      const ch = body[col]
      if (ch === 'x' || ch === 'X') {
        warnings.add('O símbolo "x" (corda abafada) ainda não é interpretado e foi ignorado.')
        continue
      }
      if (!/\d/.test(ch) || (col > 0 && /\d/.test(body[col - 1]))) continue
      const digits = readDigits(body, col)
      if (!digits) continue

      const note: Note = { string: (s + 1) as StringNumber, fret: digits.fret, techniques: [] }
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
          break
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

  const block: TabBlock = {
    index: blockIndex,
    lines: ordered.map((l) => l.text),
    bodyOffsets: ordered.map((l) => l.bodyOffset),
    bodyLength: length,
  }
  return { block, events }
}

export function parseTab(input: string): ParseResult {
  const text = input.replace(/\r\n?/g, '\n')
  if (!text.trim()) {
    return { ok: false, error: 'Cole uma tablatura antes de processar.' }
  }

  const groups = groupLines(text.split('\n'))
  const warnings = new Set<string>()
  const blocksRaw: RawLine[][] = []
  for (const group of groups) {
    if (group.length % 6 === 0) {
      for (let i = 0; i < group.length; i += 6) blocksRaw.push(group.slice(i, i + 6))
    } else {
      warnings.add(
        `Um trecho com ${group.length} linha(s) foi ignorado: cada bloco precisa ter exatamente 6 cordas.`,
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
  blocksRaw.forEach((raw, index) => {
    const parsed = parseBlock(raw, index, nextId, warnings)
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
