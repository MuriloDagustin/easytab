import { useEffect, useRef } from 'react'
import type { ParsedTab, StringNumber, TabEvent } from '../../domain/tab/types'

interface Props {
  tab: ParsedTab
  currentIndex: number
  hardEvents: number[]
  stringFilter: StringNumber | null
  onSelect: (index: number) => void
}

interface Segment {
  text: string
  event: TabEvent | null
}

function buildSegments(line: string, offset: number, events: TabEvent[]): Segment[] {
  const head = line.slice(0, offset)
  const body = line.slice(offset)
  const segments: Segment[] = head ? [{ text: head, event: null }] : []
  const sorted = [...events].sort((a, b) => a.column - b.column)

  let cursor = 0
  for (const event of sorted) {
    if (event.column < cursor) continue
    if (event.column > cursor) segments.push({ text: body.slice(cursor, event.column), event: null })
    const end = Math.min(event.column + event.width, body.length)
    segments.push({ text: body.slice(event.column, end) || ' ', event })
    cursor = end
  }
  if (cursor < body.length) segments.push({ text: body.slice(cursor), event: null })
  return segments
}

export function TabView({ tab, currentIndex, hardEvents, stringFilter, onSelect }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [currentIndex])

  return (
    <div className="overflow-x-auto">
      <pre className="inline-block min-w-full font-mono text-[13px] leading-6 sm:text-sm">
        {tab.blocks.map((block) => {
          const blockEvents = tab.events.filter((e) => e.blockIndex === block.index)
          return (
            <div key={block.index} className={block.index > 0 ? 'mt-4' : ''} data-block>
              {block.heading && (
                <div className="mb-1 font-sans text-xs whitespace-normal text-muted italic" data-heading>
                  {block.heading}
                </div>
              )}
              {block.chordLine && <div className="whitespace-pre text-accent-strong">{block.chordLine}</div>}
              {block.lines.map((line, lineIndex) => {
                const stringNumber = (lineIndex + 1) as StringNumber
                const lineEvents = blockEvents.filter((e) => e.notes.some((n) => n.string === stringNumber))
                const dimmed = stringFilter !== null && stringFilter !== stringNumber
                return (
                  <div key={lineIndex} className={`whitespace-pre ${dimmed ? 'opacity-40' : ''}`}>
                    {buildSegments(line, block.bodyOffsets[lineIndex], lineEvents).map((segment, i) => {
                      if (!segment.event) {
                        return (
                          <span key={i} className="text-muted">
                            {segment.text}
                          </span>
                        )
                      }
                      const isCurrent = segment.event.id === currentIndex
                      const isHard = hardEvents.includes(segment.event.id)
                      return (
                        <button
                          key={i}
                          ref={isCurrent ? activeRef : undefined}
                          type="button"
                          onClick={() => onSelect(segment.event!.id)}
                          aria-current={isCurrent ? 'step' : undefined}
                          aria-label={`Evento ${segment.event.id + 1}${isHard ? ', marcado como difícil' : ''}`}
                          className={`cursor-pointer rounded-sm whitespace-pre ${
                            isCurrent
                              ? 'bg-accent font-bold text-accent-ink'
                              : isHard
                                ? 'bg-danger/25 text-danger underline decoration-dotted hover:bg-danger/40'
                                : 'text-string hover:bg-surface-2'
                          }`}
                        >
                          {segment.text}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        })}
      </pre>
    </div>
  )
}
