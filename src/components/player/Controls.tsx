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
}

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

        {stringFilter !== null && (
          <span className="text-sm text-muted">
            {visiblePosition} de {visibleTotal} nesta corda
          </span>
        )}
      </div>

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
