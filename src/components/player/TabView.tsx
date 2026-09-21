import { useEffect, useRef } from 'react'
import type { ParsedTab, TabEvent } from '../../domain/tab/types'

interface Props {
  tab: ParsedTab
  currentIndex: number
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

export function TabView({ tab, currentIndex, onSelect }: Props) {
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
            <div key={block.index} className={block.index > 0 ? 'mt-4' : ''}>
              {block.lines.map((line, lineIndex) => {
                const stringNumber = lineIndex + 1
                const lineEvents = blockEvents.filter((e) => e.notes.some((n) => n.string === stringNumber))
                return (
                  <div key={lineIndex} className="whitespace-pre">
                    {buildSegments(line, block.bodyOffsets[lineIndex], lineEvents).map((segment, i) =>
                      segment.event ? (
                        <button
                          key={i}
                          ref={segment.event.id === currentIndex ? activeRef : undefined}
                          type="button"
                          onClick={() => onSelect(segment.event!.id)}
                          aria-current={segment.event.id === currentIndex ? 'step' : undefined}
                          aria-label={`Evento ${segment.event.id + 1}`}
                          className={`cursor-pointer rounded-sm whitespace-pre ${
                            segment.event.id === currentIndex
                              ? 'bg-accent font-bold text-accent-ink'
                              : 'text-string hover:bg-surface-2'
                          }`}
                        >
                          {segment.text}
                        </button>
                      ) : (
                        <span key={i} className="text-muted">
                          {segment.text}
                        </span>
                      ),
                    )}
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
