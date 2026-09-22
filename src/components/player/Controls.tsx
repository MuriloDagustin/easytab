import { DRUM_PATTERNS, type DrumPattern } from '../../audio/beat'
import type { SpeedTrainer } from '../../domain/speedTrainer'
import type { StringNumber } from '../../domain/tab/types'
import { Button } from '../ui/Button'

interface Props {
  visiblePosition: number
  visibleTotal: number
  loopEnabled: boolean
  loopStart: number
  loopEnd: number
  countIn: boolean
  stringFilter: StringNumber | null
  onRestart: () => void
  onToggleLoop: () => void
  onSetLoopStart: () => void
  onSetLoopEnd: () => void
  onCountIn: (value: boolean) => void
  onStringFilter: (string: StringNumber | null) => void
  metronome: boolean
  drums: DrumPattern
  playRepeats: boolean
  hasRepeats: boolean
  trainer: SpeedTrainer
  onMetronome: (value: boolean) => void
  onDrums: (pattern: DrumPattern) => void
  onPlayRepeats: (value: boolean) => void
  onTrainer: (patch: Partial<SpeedTrainer>) => void
}

const TRAINER_SPEEDS = [0.25, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5]
const TRAINER_STEPS = [0.02, 0.05, 0.1]

const percent = (v: number) => `${Math.round(v * 100)}%`

const STRING_LABELS = ['1ª (mais fina)', '2ª', '3ª', '4ª', '5ª', '6ª (mais grossa)']

export function Controls(props: Props) {
  const { visiblePosition, visibleTotal, loopEnabled, loopStart, loopEnd, countIn, stringFilter } = props
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={props.onRestart} aria-label="Reiniciar do começo">
          ↺ Reiniciar
        </Button>

        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={countIn} onChange={(e) => props.onCountIn(e.target.checked)} className="size-5 accent-[#f5b942]" />
          Contagem antes de tocar
        </label>

        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={props.metronome} onChange={(e) => props.onMetronome(e.target.checked)} className="size-5 accent-[#f5b942]" />
          Metrônomo
        </label>

        <label className="flex items-center gap-2 text-sm text-muted">
          Bateria
          <select
            value={props.drums}
            onChange={(e) => props.onDrums(e.target.value as DrumPattern)}
            className="min-h-11 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-text"
          >
            {DRUM_PATTERNS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        {props.hasRepeats && (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={props.playRepeats} onChange={(e) => props.onPlayRepeats(e.target.checked)} className="size-5 accent-[#f5b942]" />
            Tocar as repetições indicadas (2X)
          </label>
        )}

        {stringFilter !== null && (
          <span className="text-sm text-muted">
            {visiblePosition} de {visibleTotal} nesta corda
          </span>
        )}
      </div>

      <fieldset className="rounded-xl border border-border p-3">
        <legend className="px-1 text-xs tracking-wide text-muted uppercase">Treino de velocidade</legend>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={props.trainer.enabled}
              onChange={(e) => props.onTrainer({ enabled: e.target.checked })}
              className="size-5 accent-[#f5b942]"
            />
            Acelerar a cada volta
          </label>
          {(
            [
              ['start', 'Começa em', TRAINER_SPEEDS],
              ['step', 'Sobe', TRAINER_STEPS],
              ['target', 'Até', TRAINER_SPEEDS],
            ] as const
          ).map(([key, label, options]) => (
            <label key={key} className="flex items-center gap-2 text-muted">
              {label}
              <select
                value={props.trainer[key]}
                onChange={(e) => props.onTrainer({ [key]: Number(e.target.value) })}
                className="min-h-11 rounded-xl border border-border bg-surface-2 px-2 py-2 text-sm text-text"
              >
                {options.map((v) => (
                  <option key={v} value={v}>
                    {key === 'step' ? `+${percent(v)}` : percent(v)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Toca o trecho em repetição e aumenta a velocidade a cada volta até o alvo. Sem trecho marcado, repete a
          tablatura inteira.
        </p>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset className="rounded-xl border border-border p-3">
          <legend className="px-1 text-xs tracking-wide text-muted uppercase">Repetir um trecho</legend>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={props.onSetLoopStart}>Início aqui</Button>
            <Button onClick={props.onSetLoopEnd}>Fim aqui</Button>
            <label className="ml-1 flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={loopEnabled} onChange={props.onToggleLoop} className="size-5 accent-[#f5b942]" />
              Repetir
            </label>
            <span className="text-sm text-muted">
              Notas {loopStart + 1} a {loopEnd + 1}
            </span>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-border p-3">
          <legend className="px-1 text-xs tracking-wide text-muted uppercase">Uma corda de cada vez</legend>
          <label className="flex flex-wrap items-center gap-2 text-sm text-muted">
            Mostrar só a
            <select
              value={stringFilter ?? ''}
              onChange={(e) => props.onStringFilter(e.target.value ? (Number(e.target.value) as StringNumber) : null)}
              aria-label="Filtrar por corda"
              className="min-h-11 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-text"
            >
              <option value="">todas as cordas</option>
              {STRING_LABELS.map((label, i) => (
                <option key={i} value={i + 1}>
                  {label} corda
                </option>
              ))}
            </select>
          </label>
        </fieldset>
      </div>
    </div>
  )
}
