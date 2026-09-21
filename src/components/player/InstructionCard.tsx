import { describeEvent } from '../../domain/instructions/describe'
import type { TabEvent } from '../../domain/tab/types'

interface Props {
  event: TabEvent
  position: number
  total: number
  showPitches: boolean
}

export function InstructionCard({ event, position, total, showPitches }: Props) {
  const description = describeEvent(event)
  return (
    <div aria-live="polite">
      <p className="text-xs tracking-wide text-muted uppercase">
        Passo {position} de {total}
      </p>
      <p className="mt-2 text-xl leading-snug font-semibold sm:text-2xl">{description.main}</p>
      {description.details.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm text-muted">
          {description.details.map((detail, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="text-accent">
                →
              </span>
              {detail}
            </li>
          ))}
        </ul>
      )}
      {showPitches && (
        <p className="mt-3 text-xs text-muted">Som esperado: {description.pitches.join(' · ')}</p>
      )}
    </div>
  )
}
