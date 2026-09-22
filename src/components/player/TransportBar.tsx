import { SPEEDS } from '../../audio/player'
import { Button } from '../ui/Button'

interface Props {
  index: number
  total: number
  playing: boolean
  speed: number
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  onPlayEvent: () => void
  onTogglePlay: () => void
  onSpeed: (speed: number) => void
  /** Velocidade atual do treino de velocidade, enquanto ele roda. */
  trainerSpeed?: number | null
  recording?: { tapped: number; total: number; onTap: () => void; onFinish: () => void; onCancel: () => void } | null
}

/** Barra fixa no rodapé com o que o aluno aperta o tempo todo. */
export function TransportBar({
  index,
  total,
  playing,
  speed,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onPlayEvent,
  onTogglePlay,
  onSpeed,
  trainerSpeed = null,
  recording = null,
}: Props) {
  if (recording) {
    return (
      <div
        role="toolbar"
        aria-label="Gravação de ritmo"
        className="sticky bottom-0 z-20 -mx-4 border-t border-danger/50 bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur print:hidden"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-2">
          <Button size="lg" variant="primary" className="w-full min-h-16 text-lg" onClick={recording.onTap}>
            ⏺ Toque aqui a cada nota
          </Button>
          <div className="flex items-center justify-between gap-2 text-sm text-muted">
            <span>
              {recording.tapped} de {recording.total} notas
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={recording.onCancel}>
                Cancelar
              </Button>
              <Button onClick={recording.onFinish} disabled={recording.tapped < 2}>
                Concluir
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      role="toolbar"
      aria-label="Controles de reprodução"
      className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur print:hidden"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2">
        <div className="grid grid-cols-4 gap-2">
          <Button size="lg" onClick={onPrev} disabled={!canPrev} aria-label="Nota anterior">
            <span aria-hidden>←</span>
            <span className="hidden sm:inline">Anterior</span>
          </Button>
          <Button size="lg" onClick={onPlayEvent} aria-label="Tocar a nota atual">
            <span aria-hidden>🔈</span>
            <span className="hidden sm:inline">Tocar nota</span>
          </Button>
          <Button
            size="lg"
            variant="primary"
            onClick={onTogglePlay}
            aria-label={playing ? 'Pausar a reprodução' : 'Reproduzir a sequência'}
          >
            <span aria-hidden>{playing ? '⏸' : '▶'}</span>
            <span className="hidden sm:inline">{playing ? 'Pausar' : 'Reproduzir'}</span>
          </Button>
          <Button size="lg" onClick={onNext} disabled={!canNext} aria-label="Próxima nota">
            <span className="hidden sm:inline">Próxima</span>
            <span aria-hidden>→</span>
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <span>
            Nota {index + 1} de {total}
          </span>
          {trainerSpeed !== null && (
            <span className="font-semibold text-accent-strong" role="status">
              Treino: {Math.round(trainerSpeed * 100)}%
            </span>
          )}
          <label className="flex items-center gap-2">
            Velocidade
            <select
              value={speed}
              onChange={(e) => onSpeed(Number(e.target.value))}
              className="min-h-9 rounded-lg border border-border bg-surface-2 px-2 py-1 text-sm text-text"
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  )
}
