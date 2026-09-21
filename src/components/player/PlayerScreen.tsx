import { useEffect, useMemo, useState } from 'react'
import { TabPlayer } from '../../audio/player'
import { suggestFingers } from '../../domain/fingering/suggest'
import type { ParsedTab } from '../../domain/tab/types'
import type { ViewPreferences } from '../../storage/persistence'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Controls } from './Controls'
import { Fretboard } from './Fretboard'
import { InstructionCard } from './InstructionCard'
import { Legend } from './Legend'
import { TabView } from './TabView'

interface Props {
  tab: ParsedTab
  currentIndex: number
  speed: number
  playing: boolean
  loopEnabled: boolean
  loopStart: number
  loopEnd: number
  viewPrefs: ViewPreferences
  onSelect: (index: number) => void
  onPrev: () => void
  onNext: () => void
  onSpeed: (speed: number) => void
  onPlaying: (playing: boolean) => void
  onToggleLoop: () => void
  onSetLoopStart: () => void
  onSetLoopEnd: () => void
  onPref: (key: keyof ViewPreferences, value: boolean) => void
  onEdit: () => void
  onNewTab: () => void
  onClearSaved: () => void
}

const FRET_WINDOW = 4

export function PlayerScreen(props: Props) {
  const { tab, currentIndex, speed, playing, loopEnabled, loopStart, loopEnd, viewPrefs } = props
  const [player] = useState(() => new TabPlayer())
  const [audioError, setAudioError] = useState<string | null>(null)

  useEffect(() => () => player.dispose(), [player])

  const event = tab.events[Math.min(currentIndex, tab.events.length - 1)]

  const fretRange = useMemo(() => {
    const frets = event.notes.map((n) => n.fret).filter((f) => f > 0)
    const targets = event.notes.map((n) => n.targetFret).filter((f): f is number => f !== undefined && f > 0)
    const all = [...frets, ...targets]
    if (!all.length) return { min: 1, max: FRET_WINDOW }
    const min = Math.max(1, Math.min(...all) - 1)
    return { min, max: Math.max(...all, min + FRET_WINDOW - 1) }
  }, [event])

  const fingers = useMemo(() => suggestFingers(tab.events, currentIndex), [tab.events, currentIndex])

  async function playCurrent() {
    try {
      await player.playEvent(event, speed)
      setAudioError(null)
    } catch {
      setAudioError('Não consegui iniciar o som. Toque na tela uma vez e tente de novo.')
    }
  }

  function stopPlayback() {
    player.pause()
    props.onPlaying(false)
  }

  async function startPlayback(fromIndex = currentIndex) {
    const start = loopEnabled ? loopStart : fromIndex
    const end = loopEnabled ? loopEnd : tab.events.length - 1
    props.onPlaying(true)
    try {
      await player.playSequence({
        events: tab.events,
        startIndex: start > end ? end : start,
        endIndex: end,
        speed,
        loop: loopEnabled,
        onEvent: props.onSelect,
        onFinish: () => props.onPlaying(false),
      })
    } catch {
      setAudioError('Não consegui iniciar o som. Toque na tela uma vez e tente de novo.')
      props.onPlaying(false)
    }
  }

  function togglePlay() {
    if (playing) stopPlayback()
    else void startPlayback()
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        stopPlayback()
        props.onNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        stopPlayback()
        props.onPrev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function selectEvent(index: number) {
    props.onSelect(index)
  }

  function manualSelect(index: number) {
    if (playing) stopPlayback()
    selectEvent(index)
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 pb-10">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Tab Fácil</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={props.onEdit}>Editar tablatura</Button>
          <Button onClick={props.onNewTab}>Nova tablatura</Button>
        </div>
      </header>

      {audioError && <Alert tone="error">{audioError}</Alert>}

      {tab.warnings.length > 0 && (
        <Alert tone="warning" title="Avisos da leitura">
          <ul className="list-inside list-disc space-y-1">
            {tab.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Alert>
      )}

      <Card title="Tablatura">
        <TabView tab={tab} currentIndex={currentIndex} onSelect={manualSelect} />
        <p className="mt-3 text-xs text-muted">Toque em qualquer nota destacada para ir direto até ela.</p>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card title="O que fazer agora">
          <InstructionCard
            event={event}
            position={currentIndex + 1}
            total={tab.events.length}
            showPitches={viewPrefs.showPitches}
          />
        </Card>

        <Card
          title="Braço da guitarra"
          action={
            <label className="flex items-center gap-2 text-xs text-muted normal-case">
              <input
                type="checkbox"
                checked={viewPrefs.showFingers}
                onChange={(e) => props.onPref('showFingers', e.target.checked)}
                className="size-4 accent-[#f5b942]"
              />
              Sugerir dedo
            </label>
          }
        >
          <Fretboard
            event={event}
            minFret={fretRange.min}
            maxFret={fretRange.max}
            fingers={fingers}
            showFingers={viewPrefs.showFingers}
          />
          <p className="mt-2 text-xs text-muted">
            Círculo vazado antes do traço branco = corda solta. Círculo cheio = casa pressionada.
            {viewPrefs.showFingers && fingers === null && ' Sem sugestão de dedo confiável para este trecho.'}
          </p>
        </Card>
      </div>

      <Card title="Controles">
        <Controls
          index={currentIndex}
          total={tab.events.length}
          playing={playing}
          speed={speed}
          loopEnabled={loopEnabled}
          loopStart={loopStart}
          loopEnd={loopEnd}
          onPrev={() => {
            stopPlayback()
            props.onPrev()
          }}
          onNext={() => {
            stopPlayback()
            props.onNext()
          }}
          onPlayEvent={() => void playCurrent()}
          onTogglePlay={togglePlay}
          onRestart={() => {
            stopPlayback()
            props.onSelect(0)
          }}
          onSpeed={props.onSpeed}
          onToggleLoop={props.onToggleLoop}
          onSetLoopStart={props.onSetLoopStart}
          onSetLoopEnd={props.onSetLoopEnd}
        />
        <p className="mt-3 text-xs text-muted">
          Atalhos: espaço toca ou pausa, seta direita avança, seta esquerda volta.
        </p>
      </Card>

      <Card
        title="Como ler a tablatura"
        action={
          <Button variant="ghost" onClick={() => props.onPref('showLegend', !viewPrefs.showLegend)}>
            {viewPrefs.showLegend ? 'Esconder' : 'Mostrar'}
          </Button>
        }
      >
        {viewPrefs.showLegend ? (
          <Legend />
        ) : (
          <p className="text-sm text-muted">
            Guia rápido dos símbolos da tablatura e um aviso importante sobre ritmo.
          </p>
        )}
      </Card>

      <div className="flex justify-center pt-2">
        <Button variant="danger" onClick={props.onClearSaved}>
          Apagar dados salvos
        </Button>
      </div>
    </div>
  )
}
