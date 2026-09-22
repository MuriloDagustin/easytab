import { describeEvent } from '../../domain/instructions/describe'
import type { Setup } from '../../domain/music/tuning'
import type { TabEvent } from '../../domain/tab/types'

interface Props {
  event: TabEvent
  position: number
  total: number
  showPitches: boolean
  setup: Setup
  isHard: boolean
  /** Título de seção ou observação escrita acima do bloco na tablatura original. */
  section?: string
  onChord?: (name: string) => void
}

export function InstructionCard({ event, position, total, showPitches, setup, isHard, section, onChord }: Props) {
  const description = describeEvent(event, setup)
  return (
    <div aria-live="polite">
      {section && (
        <p className="mb-2 truncate text-xs text-muted italic" title={section}>
          Seção: {section}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs tracking-wide text-muted uppercase">
        <span>
          Passo {position} de {total}
        </span>
        {description.chord &&
          (onChord ? (
            <button
              type="button"
              onClick={() => onChord(description.chord!)}
              className="rounded-md bg-accent/15 px-2 py-0.5 font-semibold text-accent-strong normal-case underline decoration-dotted hover:bg-accent/25"
            >
              Acorde {description.chord} · ver forma
            </button>
          ) : (
            <span className="rounded-md bg-accent/15 px-2 py-0.5 font-semibold text-accent-strong normal-case">Acorde {description.chord}</span>
          ))}
        {isHard && <span className="rounded-md bg-danger/15 px-2 py-0.5 font-semibold text-danger">Difícil</span>}
      </div>
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
      {showPitches && description.pitches.length > 0 && (
        <p className="mt-3 text-xs text-muted">Som esperado: {description.pitches.join(' · ')}</p>
      )}
    </div>
  )
}
