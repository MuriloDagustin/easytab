import type { ReviewSuggestion } from '../../domain/review'
import type { PracticeRecord } from '../../storage/persistence'
import { Button } from '../ui/Button'

interface Props {
  suggestions: ReviewSuggestion[]
  practice: Record<number, PracticeRecord>
  onPractice: (eventId: number) => void
}

export function ReviewPanel({ suggestions, practice, onPractice }: Props) {
  const attempts = Object.values(practice).reduce((sum, r) => sum + r.attempts, 0)
  const hits = Object.values(practice).reduce((sum, r) => sum + r.hits, 0)

  return (
    <div className="flex flex-col gap-3 text-sm">
      {attempts > 0 && (
        <p className="text-muted">
          Você já praticou {attempts} nota{attempts > 1 ? 's' : ''} com o microfone e acertou{' '}
          {Math.round((hits / attempts) * 100)}%.
        </p>
      )}
      {suggestions.length === 0 ? (
        <p className="text-muted">
          Marque trechos como difíceis ou pratique com o microfone. As sugestões de revisão aparecem aqui.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {suggestions.map((s) => (
            <li key={s.eventId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 p-3">
              <span>
                <span className="font-semibold">Nota {s.eventId + 1}</span>
                <span className="text-muted"> · {s.reason}</span>
              </span>
              <Button onClick={() => onPractice(s.eventId)}>Praticar este trecho</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
