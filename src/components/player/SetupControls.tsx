import { INSTRUMENTS, type Timbre } from '../../audio/instruments'
import { MAX_CAPO, TUNINGS } from '../../domain/music/tuning'

interface Props {
  tuningId: string
  capo: number
  timbre: Timbre
  loadingSamples: boolean
  onTuning: (id: string) => void
  onCapo: (capo: number) => void
  onTimbre: (timbre: Timbre) => void
}

export function SetupControls({ tuningId, capo, timbre, loadingSamples, onTuning, onCapo, onTimbre }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <label className="flex flex-wrap items-center gap-2 text-sm text-muted">
        Afinação
        <select
          value={tuningId}
          onChange={(e) => onTuning(e.target.value)}
          className="min-h-11 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-text"
        >
          {TUNINGS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-muted">
        Capotraste
        <select
          value={capo}
          onChange={(e) => onCapo(Number(e.target.value))}
          className="min-h-11 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-text"
        >
          <option value={0}>sem capo</option>
          {Array.from({ length: MAX_CAPO }, (_, i) => i + 1).map((c) => (
            <option key={c} value={c}>
              casa {c}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-muted">
        Som
        <select
          value={timbre}
          onChange={(e) => onTimbre(e.target.value as Timbre)}
          className="min-h-11 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-text"
        >
          {INSTRUMENTS.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        {loadingSamples && <span className="text-xs text-accent-strong">carregando amostras…</span>}
      </label>
      <p className="text-xs text-muted">
        Toque nas letras das cordas no braço para ouvir cada corda solta e afinar. Os sons de violão e guitarra
        são gravações reais, baixadas na primeira vez que você escolhe cada um.
      </p>
    </div>
  )
}
