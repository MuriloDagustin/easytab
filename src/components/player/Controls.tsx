import { SPEEDS } from '../../audio/player'
import { Button } from '../ui/Button'

interface Props {
  index: number
  total: number
  playing: boolean
  speed: number
  loopEnabled: boolean
  loopStart: number
  loopEnd: number
  onPrev: () => void
  onNext: () => void
  onPlayEvent: () => void
  onTogglePlay: () => void
  onRestart: () => void
  onSpeed: (speed: number) => void
  onToggleLoop: () => void
  onSetLoopStart: () => void
  onSetLoopEnd: () => void
}

export function Controls({
  index,
  total,
  playing,
  speed,
  loopEnabled,
  loopStart,
  loopEnd,
  onPrev,
  onNext,
  onPlayEvent,
  onTogglePlay,
  onRestart,
  onSpeed,
  onToggleLoop,
  onSetLoopStart,
  onSetLoopEnd,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button size="lg" onClick={onPrev} disabled={index === 0} aria-label="Nota anterior">
          ← Anterior
        </Button>
        <Button size="lg" onClick={onNext} disabled={index >= total - 1} aria-label="Próxima nota">
          Próxima →
        </Button>
        <Button size="lg" onClick={onPlayEvent} aria-label="Tocar a nota atual">
          🔈 Tocar nota
        </Button>
        <Button
          size="lg"
          variant="primary"
          onClick={onTogglePlay}
          aria-label={playing ? 'Pausar a reprodução' : 'Reproduzir a sequência'}
        >
          {playing ? '⏸ Pausar' : '▶ Reproduzir'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onRestart} aria-label="Reiniciar do começo">
          ↺ Reiniciar
        </Button>

        <label className="flex items-center gap-2 text-sm text-muted">
          Velocidade
          <select
            value={speed}
            onChange={(e) => onSpeed(Number(e.target.value))}
            className="min-h-11 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-text"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>

        <span className="text-sm text-muted">
          Nota {index + 1} de {total}
        </span>
      </div>

      <fieldset className="rounded-xl border border-border p-3">
        <legend className="px-1 text-xs tracking-wide text-muted uppercase">Repetir um trecho</legend>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onSetLoopStart}>Início aqui</Button>
          <Button onClick={onSetLoopEnd}>Fim aqui</Button>
          <label className="ml-1 flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={loopEnabled}
              onChange={onToggleLoop}
              className="size-5 accent-[#f5b942]"
            />
            Repetir
          </label>
          <span className="text-sm text-muted">
            Notas {loopStart + 1} a {loopEnd + 1}
          </span>
        </div>
      </fieldset>
    </div>
  )
}
