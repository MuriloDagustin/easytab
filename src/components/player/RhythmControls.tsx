import { DURATION_LABELS, type Duration, type RhythmAnnotations } from '../../domain/rhythm'
import { Button } from '../ui/Button'

interface Props {
  eventId: number
  rhythm: RhythmAnnotations
  isHard: boolean
  onDuration: (duration: Duration) => void
  onTogglePause: () => void
  onToggleHard: () => void
}

const ORDER: Duration[] = ['short', 'normal', 'long']

export function RhythmControls({ eventId, rhythm, isHard, onDuration, onTogglePause, onToggleHard }: Props) {
  const current = rhythm.durations[eventId] ?? 'normal'
  const paused = rhythm.pausesAfter.includes(eventId)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">Duração desta nota</span>
        <div role="radiogroup" aria-label="Duração da nota" className="inline-flex rounded-xl border border-border p-1">
          {ORDER.map((d) => (
            <button
              key={d}
              role="radio"
              aria-checked={current === d}
              onClick={() => onDuration(d)}
              className={`min-h-9 rounded-lg px-3 text-sm transition-colors ${
                current === d ? 'bg-accent font-semibold text-accent-ink' : 'text-muted hover:text-text'
              }`}
            >
              {DURATION_LABELS[d]}
            </button>
          ))}
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={paused} onChange={onTogglePause} className="size-5 accent-[#f5b942]" />
          Pausa depois
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant={isHard ? 'danger' : 'secondary'} onClick={onToggleHard} aria-pressed={isHard}>
          {isHard ? '★ Marcado como difícil' : '☆ Marcar como difícil'}
        </Button>
        <p className="text-xs text-muted">
          A tab não traz ritmo. Ajuste durações e pausas ouvindo a música original.
        </p>
      </div>
    </div>
  )
}
