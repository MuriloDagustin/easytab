import { useEffect, useRef, type RefObject } from 'react'
import { staffNote } from '../../domain/music/notation'
import { fretToMidi, stringInfo, type Setup } from '../../domain/music/tuning'
import type { ParsedTab, StringNumber, TabBlock, TabEvent } from '../../domain/tab/types'

interface Props {
  tab: ParsedTab
  currentIndex: number
  hardEvents: number[]
  stringFilter: StringNumber | null
  setup: Setup
  showNotation?: boolean
  onSelect: (index: number) => void
  onChord?: (name: string) => void
}

const COL = 11
const GAP = 15
const LEFT = 34
const TOP = 12
const BOTTOM = 10
const HALF = 4
const STRING_STROKE = ['#8e95a6', '#8a90a0', '#858b9b', '#7f8595', '#7a808f', '#747a89']

/** Caracteres do corpo que não são nota nem preenchimento: técnicas, x, ~ etc. */
const GLYPH = /[~/\\hpbrxXtT]/

function bodyOf(block: TabBlock, lineIndex: number): string {
  return block.lines[lineIndex].slice(block.bodyOffsets[lineIndex]).padEnd(block.bodyLength, '-').slice(0, block.bodyLength)
}

function barColumns(block: TabBlock): number[] {
  const columns = new Set<number>()
  for (let i = 0; i < 6; i++) {
    const body = bodyOf(block, i)
    for (let c = 0; c < body.length; c++) if (body[c] === '|') columns.add(c)
  }
  return [...columns].sort((a, b) => a - b)
}

interface Glyph {
  string: StringNumber
  column: number
  char: string
}

function glyphsOf(block: TabBlock, events: TabEvent[]): Glyph[] {
  const covered = new Set<string>()
  for (const e of events) {
    for (const n of e.notes) {
      const width = n.muted ? 1 : String(n.fret).length
      for (let c = e.column; c < e.column + width; c++) covered.add(`${n.string}:${c}`)
    }
  }
  const glyphs: Glyph[] = []
  for (let i = 0; i < 6; i++) {
    const body = bodyOf(block, i)
    for (let c = 0; c < body.length; c++) {
      const ch = body[c]
      if (GLYPH.test(ch) && !covered.has(`${i + 1}:${c}`)) glyphs.push({ string: (i + 1) as StringNumber, column: c, char: ch })
    }
  }
  return glyphs
}

function chordTokens(chordLine: string | undefined, bodyOffset: number): Array<{ column: number; text: string }> {
  if (!chordLine) return []
  const tokens: Array<{ column: number; text: string }> = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(chordLine))) tokens.push({ column: Math.max(0, m.index - bodyOffset), text: m[0] })
  return tokens
}

interface BlockProps {
  block: TabBlock
  events: TabEvent[]
  currentIndex: number
  hardEvents: number[]
  stringFilter: StringNumber | null
  setup: Setup
  showNotation: boolean
  onSelect: (index: number) => void
  onChord?: (name: string) => void
  activeRef: RefObject<SVGGElement | null>
}

function BlockGraphic({ block, events, currentIndex, hardEvents, stringFilter, setup, showNotation, onSelect, onChord, activeRef }: BlockProps) {
  const x = (column: number) => LEFT + column * COL
  const width = LEFT + block.bodyLength * COL + 12

  const staff = showNotation
    ? events.map((e) => ({
        event: e,
        notes: e.notes.filter((n) => !n.muted).map((n) => ({ string: n.string, ...staffNote(fretToMidi(n.string, n.fret, setup)) })),
      }))
    : []
  const steps = staff.flatMap((s) => s.notes.map((n) => n.step))
  const topStep = showNotation ? Math.max(12, ...steps) + 2 : 0
  const bottomStep = showNotation ? Math.min(-2, ...steps) - 2 : 0
  const staffHeight = showNotation ? (topStep - bottomStep) * HALF : 0
  const stepY = (step: number) => TOP + (topStep - step) * HALF

  const chords = chordTokens(block.chordLine, block.bodyOffsets[0])
  const chordSpace = chords.length ? 18 : 0
  const top = TOP + staffHeight + chordSpace
  const height = top + GAP * 5 + BOTTOM
  const y = (s: StringNumber) => top + (s - 1) * GAP

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="block shrink-0"
      role="group"
      aria-label={block.heading ? `Bloco: ${block.heading}` : `Bloco ${block.index + 1}`}
    >
      {showNotation && (
        <g data-staff>
          {[0, 2, 4, 6, 8].map((step) => (
            <line key={step} className="staff-line" x1={LEFT - 26} x2={width - 12} y1={stepY(step)} y2={stepY(step)} stroke="#6b7180" strokeWidth="0.9" />
          ))}
          <text
            x={LEFT - 24}
            y={stepY(0) + 6}
            className="fill-[#a3a9b8]"
            style={{ fontSize: 38, fontFamily: '"Noto Music", "Bravura", "Segoe UI Symbol", "Apple Symbols", serif' }}
            aria-hidden
          >
            𝄞
          </text>
          <text x={LEFT - 15} y={stepY(-4)} textAnchor="middle" className="fill-[#a3a9b8] text-[8px]" aria-hidden>
            8
          </text>
          {staff.map(({ event, notes }) => {
            if (!notes.length) return null
            const cx = x(event.column) + (event.width * COL) / 2
            const isCurrent = event.id === currentIndex
            const color = isCurrent ? '#f5b942' : '#eef0f4'
            const highest = Math.max(...notes.map((n) => n.step))
            const lowest = Math.min(...notes.map((n) => n.step))
            const stemUp = (highest + lowest) / 2 < 4
            return (
              <g key={event.id} data-notation-event={event.id}>
                {notes.flatMap((n) => n.ledgers).filter((v, i, a) => a.indexOf(v) === i).map((l) => (
                  <line key={`l${l}`} className="staff-line" x1={cx - 8} x2={cx + 8} y1={stepY(l)} y2={stepY(l)} stroke="#6b7180" strokeWidth="0.9" />
                ))}
                {notes.map((n) => (
                  <g key={n.string}>
                    <ellipse className="notehead" cx={cx} cy={stepY(n.step)} rx="4.6" ry="3.4" transform={`rotate(-20 ${cx} ${stepY(n.step)})`} fill={color} />
                    {n.sharp && (
                      <text x={cx - 11} y={stepY(n.step) + 4.5} textAnchor="middle" className="text-[13px] font-bold" fill={color}>
                        ♯
                      </text>
                    )}
                  </g>
                ))}
                <line
                  className="stem"
                  x1={stemUp ? cx + 4.2 : cx - 4.2}
                  x2={stemUp ? cx + 4.2 : cx - 4.2}
                  y1={stemUp ? stepY(lowest) : stepY(highest)}
                  y2={stemUp ? stepY(highest) - 24 : stepY(lowest) + 24}
                  stroke={color}
                  strokeWidth="1"
                />
              </g>
            )
          })}
        </g>
      )}

      {chords.map((c, i) => (
        <text
          key={i}
          x={x(c.column)}
          y={top - 9}
          role={onChord ? 'button' : undefined}
          tabIndex={onChord ? 0 : undefined}
          aria-label={onChord ? `Ver acorde ${c.text}` : undefined}
          className={`chord fill-[#ffd166] text-[11px] font-semibold ${onChord ? 'cursor-pointer underline decoration-dotted' : ''}`}
          onClick={() => onChord?.(c.text)}
          onKeyDown={(e) => {
            if (onChord && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              onChord(c.text)
            }
          }}
        >
          {c.text}
        </text>
      ))}

      {([1, 2, 3, 4, 5, 6] as StringNumber[]).map((s) => {
        const dimmed = stringFilter !== null && stringFilter !== s
        return (
          <g key={s} opacity={dimmed ? 0.35 : 1}>
            <text x={LEFT - 8} y={y(s) + 3.5} textAnchor="end" className="fill-[#7b8291] text-[9px]">
              {stringInfo(s, setup).letter}
            </text>
            <line className="string-line" x1={LEFT} y1={y(s)} x2={width - 12} y2={y(s)} stroke={STRING_STROKE[s - 1]} strokeWidth={0.8 + (s - 1) * 0.1} />
          </g>
        )
      })}

      {barColumns(block).map((c) => (
        <line key={c} className="string-line" x1={x(c) + COL / 2} y1={y(1)} x2={x(c) + COL / 2} y2={y(6)} stroke="#8e95a6" strokeWidth="1.2" />
      ))}

      {glyphsOf(block, events).map((g, i) => (
        <text
          key={i}
          x={x(g.column) + COL / 2}
          y={y(g.string) + 3.5}
          textAnchor="middle"
          className="fill-[#a3a9b8] text-[10px]"
          style={{ paintOrder: 'stroke', stroke: '#171a21', strokeWidth: 3 }}
        >
          {g.char}
        </text>
      ))}

      {events.map((event) => {
        const isCurrent = event.id === currentIndex
        const isHard = hardEvents.includes(event.id)
        return (
          <g
            key={event.id}
            ref={isCurrent ? activeRef : undefined}
            role="button"
            tabIndex={0}
            aria-current={isCurrent ? 'step' : undefined}
            aria-label={`Evento ${event.id + 1}${isHard ? ', marcado como difícil' : ''}`}
            className="cursor-pointer"
            onClick={() => onSelect(event.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(event.id)
              }
            }}
          >
            {isCurrent && (
              <rect className="cursor" x={x(event.column) - 3} y={y(1) - 9} width={event.width * COL + 6} height={GAP * 5 + 18} rx="4" fill="#f5b942" opacity="0.16" />
            )}
            {event.notes.map((note) => {
              const dimmed = stringFilter !== null && stringFilter !== note.string
              const label = note.muted ? 'x' : String(note.fret)
              const cx = x(event.column) + (label.length * COL) / 2
              const w = label.length * 7 + 4
              return (
                <g key={note.string} opacity={dimmed ? 0.35 : 1} data-string={note.string} data-fret={note.muted ? 'x' : note.fret}>
                  <rect className="note-bg" x={cx - w / 2} y={y(note.string) - 6.5} width={w} height={13} rx="2.5" fill={isCurrent ? '#f5b942' : '#171a21'} />
                  <text
                    x={cx}
                    y={y(note.string) + 4}
                    textAnchor="middle"
                    className={`note text-[11px] font-bold ${
                      isCurrent ? 'fill-[#1a1300]' : isHard ? 'fill-[#f87171]' : note.muted ? 'fill-[#a3a9b8]' : 'fill-[#eef0f4]'
                    }`}
                  >
                    {label}
                  </text>
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

function repeatLabel(block: TabBlock): string | null {
  const parts: string[] = []
  if (block.sectionRepeat) parts.push(`seção ×${block.sectionRepeat}`)
  if (block.repeat) parts.push(`bloco ×${block.repeat}`)
  return parts.length ? parts.join(' · ') : null
}

export function TabGraphic({ tab, currentIndex, hardEvents, stringFilter, setup, showNotation = false, onSelect, onChord }: Props) {
  const activeRef = useRef<SVGGElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [currentIndex])

  return (
    <div className="max-h-[440px] overflow-auto pr-1 print:max-h-none print:overflow-visible">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        {tab.blocks.map((block) => {
          const repeat = repeatLabel(block)
          return (
            <div key={block.index} data-block className="min-w-0 max-w-full shrink-0">
              {(block.heading || repeat) && (
                <p className="mb-1 flex max-w-[520px] items-center gap-2 text-xs text-muted italic">
                  {block.heading && (
                    <span className="truncate" title={block.heading}>
                      {block.heading}
                    </span>
                  )}
                  {repeat && (
                    <span className="shrink-0 rounded bg-accent/15 px-1.5 py-0.5 font-semibold text-accent-strong not-italic" data-repeat>
                      {repeat}
                    </span>
                  )}
                </p>
              )}
              <div className="max-w-full overflow-x-auto print:overflow-visible">
                <BlockGraphic
                  block={block}
                  events={tab.events.filter((e) => e.blockIndex === block.index)}
                  currentIndex={currentIndex}
                  hardEvents={hardEvents}
                  stringFilter={stringFilter}
                  setup={setup}
                  showNotation={showNotation}
                  onSelect={onSelect}
                  onChord={onChord}
                  activeRef={activeRef}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
