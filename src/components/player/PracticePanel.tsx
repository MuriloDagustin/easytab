import { midiToNoteName } from '../../domain/music/tuning'
import type { PitchReading } from '../../audio/pitch'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'

export type PracticeStatus = 'off' | 'starting' | 'listening' | 'hit' | 'error'

interface Props {
  status: PracticeStatus
  reading: PitchReading | null
  expected: string[]
  error: string | null
  onToggle: () => void
}

export function PracticePanel({ status, reading, expected, error, onToggle }: Props) {
  const active = status !== 'off' && status !== 'error'
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant={active ? 'primary' : 'secondary'} onClick={onToggle} aria-pressed={active}>
          {active ? '🎤 Parar de ouvir' : '🎤 Praticar com o microfone'}
        </Button>
        <p className="text-sm text-muted">
          Toque a nota na sua guitarra. Quando acertar, o app avança sozinho.
        </p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {active && (
        <div role="status" aria-live="polite" className="grid gap-2 rounded-xl border border-border bg-surface-2 p-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted uppercase">Esperado</p>
            <p className="font-semibold">{expected.join(' + ') || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase">Ouvindo</p>
            <p className="font-semibold">
              {reading ? `${midiToNoteName(reading.midi)} (${reading.cents > 0 ? '+' : ''}${reading.cents} cents)` : status === 'starting' ? 'Ligando o microfone…' : 'Silêncio'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase">Resultado</p>
            <p className={`font-semibold ${status === 'hit' ? 'text-success' : ''}`}>
              {status === 'hit' ? 'Acertou! Avançando…' : 'Aguardando…'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
