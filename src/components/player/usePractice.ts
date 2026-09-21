import { useCallback, useEffect, useRef, useState } from 'react'
import { MicError, MicListener, type PitchReading } from '../../audio/pitch'
import { fretToMidi, type Setup } from '../../domain/music/tuning'
import type { TabEvent } from '../../domain/tab/types'
import type { PracticeStatus } from './PracticePanel'

const HOLD_MS = 130
const MISS_MS = 450
const ADVANCE_MS = 500

interface Options {
  event: TabEvent
  setup: Setup
  onHit: (eventId: number) => void
  onMiss: (eventId: number) => void
  onAdvance: () => void
}

type BaseStatus = Exclude<PracticeStatus, 'hit'>

export function usePractice({ event, setup, onHit, onMiss, onAdvance }: Options) {
  const [baseStatus, setBaseStatus] = useState<BaseStatus>('off')
  const [hitEventId, setHitEventId] = useState<number | null>(null)
  const [reading, setReading] = useState<PitchReading | null>(null)
  const [error, setError] = useState<string | null>(null)
  const listener = useRef<MicListener | null>(null)
  const matchSince = useRef<number | null>(null)
  const wrongSince = useRef<number | null>(null)
  const missRecorded = useRef(false)
  const advancing = useRef(false)
  const latest = useRef({ event, setup, onHit, onMiss, onAdvance })

  useEffect(() => {
    latest.current = { event, setup, onHit, onMiss, onAdvance }
  })

  useEffect(() => {
    matchSince.current = null
    wrongSince.current = null
    missRecorded.current = false
    advancing.current = false
  }, [event.id])

  const stop = useCallback(() => {
    listener.current?.stop()
    listener.current = null
    setBaseStatus('off')
    setReading(null)
    setHitEventId(null)
  }, [])

  const handleReading = useCallback((next: PitchReading | null) => {
    setReading(next)
    if (advancing.current) return
    const { event: current, setup: currentSetup, onHit: hit, onMiss: miss, onAdvance: advance } = latest.current
    const expected = current.notes.filter((n) => !n.muted).map((n) => fretToMidi(n.string, n.fret, currentSetup))
    const now = performance.now()

    const matches = next !== null && (expected.length === 0 || expected.includes(next.midi))
    if (matches) {
      wrongSince.current = null
      if (matchSince.current === null) matchSince.current = now
      if (now - matchSince.current >= HOLD_MS) {
        advancing.current = true
        setHitEventId(current.id)
        hit(current.id)
        setTimeout(advance, ADVANCE_MS)
      }
      return
    }

    matchSince.current = null
    if (next !== null && expected.length > 0) {
      if (wrongSince.current === null) wrongSince.current = now
      if (!missRecorded.current && now - wrongSince.current >= MISS_MS) {
        missRecorded.current = true
        miss(current.id)
      }
    } else {
      wrongSince.current = null
    }
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setBaseStatus('starting')
    const mic = new MicListener()
    listener.current = mic
    try {
      await mic.start(handleReading)
      setBaseStatus('listening')
    } catch (e) {
      listener.current = null
      setBaseStatus('error')
      setError(e instanceof MicError ? e.message : 'Não consegui ligar o microfone.')
    }
  }, [handleReading])

  const active = baseStatus === 'starting' || baseStatus === 'listening'

  const toggle = useCallback(() => {
    if (active) stop()
    else void start()
  }, [active, start, stop])

  useEffect(() => () => listener.current?.stop(), [])

  const status: PracticeStatus = active && hitEventId === event.id ? 'hit' : baseStatus
  return { status, reading, error, toggle, active }
}
