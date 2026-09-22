import { useEffect, useRef, useState } from 'react'
import { MicError, MicListener } from '../../audio/pitch'
import { readTuner, smoothFrequency, type TunerReading } from '../../domain/music/tuner'
import type { Setup } from '../../domain/music/tuning'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'

const HISTORY = 7

export function Tuner({ setup }: { setup: Setup }) {
  const [on, setOn] = useState(false)
  const [reading, setReading] = useState<TunerReading | null>(null)
  const [error, setError] = useState<string | null>(null)
  const listener = useRef<MicListener | null>(null)
  const history = useRef<number[]>([])
  const setupRef = useRef(setup)

  useEffect(() => {
    setupRef.current = setup
  }, [setup])

  useEffect(() => () => listener.current?.stop(), [])

  function stop() {
    listener.current?.stop()
    listener.current = null
    history.current = []
    setOn(false)
    setReading(null)
  }

  async function start() {
    setError(null)
    const mic = new MicListener()
    listener.current = mic
    setOn(true)
    try {
      await mic.start((r) => {
        if (!r) return
        history.current = [...history.current, r.frequency].slice(-HISTORY)
        setReading(readTuner(smoothFrequency(history.current), setupRef.current))
      })
    } catch (e) {
      listener.current = null
      setOn(false)
      setError(e instanceof MicError ? e.message : 'Não consegui ligar o microfone.')
    }
  }

  const cents = reading ? Math.max(-50, Math.min(50, reading.stringCents)) : 0
  const direction = !reading ? '' : reading.inTune ? 'Afinada!' : reading.stringCents < 0 ? 'Aperte a tarraxa: está baixa' : 'Solte a tarraxa: está alta'

  return (
    <div className="flex flex-col gap-3">
      <Button variant={on ? 'primary' : 'secondary'} onClick={on ? stop : () => void start()} aria-pressed={on}>
        {on ? '🎤 Desligar afinador' : '🎤 Afinador pelo microfone'}
      </Button>
      {error && <Alert tone="error">{error}</Alert>}
      {on && (
        <div role="status" aria-live="polite" className="rounded-xl border border-border bg-surface-2 p-3">
          {reading ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">{reading.note}</span>
                <span className={`text-sm font-semibold ${reading.inTune ? 'text-success' : 'text-accent-strong'}`}>{direction}</span>
              </div>
              <p className="text-xs text-muted">
                Corda mais próxima: {reading.stringLabel}, {reading.stringCents > 0 ? '+' : ''}
                {reading.stringCents} cents
              </p>
              <div className="relative mt-3 h-8" aria-hidden>
                <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded bg-border" />
                <div className="absolute top-0 left-1/2 h-8 w-0.5 -translate-x-1/2 bg-success" />
                <div
                  className={`absolute top-1 h-6 w-1.5 -translate-x-1/2 rounded ${reading.inTune ? 'bg-success' : 'bg-accent'}`}
                  style={{ left: `${50 + cents}%` }}
                  data-needle
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted" aria-hidden>
                <span>−50</span>
                <span>0</span>
                <span>+50</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Toque uma corda solta perto do microfone.</p>
          )}
        </div>
      )}
    </div>
  )
}
