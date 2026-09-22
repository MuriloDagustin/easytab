import { useEffect, useRef } from 'react'
import { stringInfo, type Setup } from '../../domain/music/tuning'
import type { ParsedTab, StringNumber, TabBlock, TabEvent } from '../../domain/tab/types'

interface Props {
  tab: ParsedTab
  currentIndex: number
  hardEvents: number[]
  stringFilter: StringNumber | null
  setup: Setup
  onSelect: (index: number) => void
}

const COL = 11
const GAP = 15
const LEFT = 34
const TOP = 12
const BOTTOM = 10
const STRING_STROKE = ['#8e95a6', '#8a90a0', '#858b9b', '#7f8595', '#7a808f', '#747a89']

/** Caracteres do corpo que não são nota nem preenchimento: técnicas, x, ~ etc. */
const GLYPH = /[~/\\hpbrxXtT]/

function bodyOf(block: TabBlock, lineIndex: number): string {
  return block.lines[lineIndex].slice(block.bodyOffsets[lineIndex]).padEnd(block.bodyLength, '-')
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
      if (GLYPH.test(ch) && !covered.has(`${i + 1}:${c}`)) {
        glyphs.push({ string: (i + 1) as StringNumber, column: c, char: ch })
      }
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

function BlockGraphic({
  block,
  events,
  currentIndex,
  hardEvents,
  stringFilter,
  setup,
  onSelect,
  activeRef,
}: {
  block: TabBlock
  events: TabEvent[]
  currentIndex: number
  hardEvents: number[]
  stringFilter: StringNumber | null
  setup: Setup
  onSelect: (index: number) => void
  activeRef: React.RefObject<SVGGElement | null>
}) {
  const chords = chordTokens(block.chordLine, block.bodyOffsets[0])
  const chordSpace = chords.length ? 16 : 0
  const top = TOP + chordSpace
  const width = LEFT + block.bodyLength * COL + 12
  const height = top + GAP * 5 + BOTTOM
  const y = (s: StringNumber) => top + (s - 1) * GAP
  const x = (column: number) => LEFT + column * COL

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="block shrink-0"
      role="group"
      aria-label={block.heading ? `Bloco: ${block.heading}` : `Bloco ${block.index + 1}`}
    >
      {chords.map((c, i) => (
        <text key={i} x={x(c.column)} y={top - 8} className="fill-[#ffd166] text-[11px] font-semibold">
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
            <line x1={LEFT} y1={y(s)} x2={width - 12} y2={y(s)} stroke={STRING_STROKE[s - 1]} strokeWidth={0.8 + (s - 1) * 0.1} />
          </g>
        )
      })}

      {barColumns(block).map((c) => (
        <line key={c} x1={x(c) + COL / 2} y1={y(1)} x2={x(c) + COL / 2} y2={y(6)} stroke="#8e95a6" strokeWidth="1.2" />
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
          {g.char === '\\' ? '\\' : g.char}
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
              <rect
                x={x(event.column) - 3}
                y={y(1) - 9}
                width={event.width * COL + 6}
                height={GAP * 5 + 18}
                rx="4"
                fill="#f5b942"
                opacity="0.16"
              />
            )}
            {event.notes.map((note) => {
              const dimmed = stringFilter !== null && stringFilter !== note.string
              const label = note.muted ? 'x' : String(note.fret)
              const cx = x(event.column) + (label.length * COL) / 2
              const w = label.length * 7 + 4
              return (
                <g key={note.string} opacity={dimmed ? 0.35 : 1} data-string={note.string} data-fret={note.muted ? 'x' : note.fret}>
                  <rect x={cx - w / 2} y={y(note.string) - 6.5} width={w} height={13} rx="2.5" fill={isCurrent ? '#f5b942' : '#171a21'} />
                  <text
                    x={cx}
                    y={y(note.string) + 4}
                    textAnchor="middle"
                    className={`text-[11px] font-bold ${
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

export function TabGraphic({ tab, currentIndex, hardEvents, stringFilter, setup, onSelect }: Props) {
  const activeRef = useRef<SVGGElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [currentIndex])

  return (
    <div className="max-h-[440px] overflow-auto pr-1">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        {tab.blocks.map((block) => (
          <div key={block.index} data-block className="min-w-0 max-w-full shrink-0">
            {block.heading && (
              <p className="mb-1 max-w-[520px] truncate text-xs text-muted italic" title={block.heading}>
                {block.heading}
              </p>
            )}
            <div className="max-w-full overflow-x-auto">
              <BlockGraphic
                block={block}
                events={tab.events.filter((e) => e.blockIndex === block.index)}
                currentIndex={currentIndex}
                hardEvents={hardEvents}
                stringFilter={stringFilter}
                setup={setup}
                onSelect={onSelect}
                activeRef={activeRef}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
