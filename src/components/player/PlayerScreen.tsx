import { useEffect, useMemo, useState, type Dispatch } from 'react'
import { TabPlayer } from '../../audio/player'
import { suggestFingersSequence } from '../../domain/fingering/suggest'
import { fretToNoteName, getTuning, type Setup } from '../../domain/music/tuning'
import { reviewRange, suggestReview } from '../../domain/review'
import { eventUnits } from '../../domain/rhythm'
import type { ParsedTab, StringNumber } from '../../domain/tab/types'
import { buildShareUrl } from '../../share/url'
import { visibleIndices, type AppAction, type AppState } from '../../state/appReducer'
import type { SavedTab } from '../../storage/persistence'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Controls } from './Controls'
import { Fretboard } from './Fretboard'
import { InstructionCard } from './InstructionCard'
import { Legend } from './Legend'
import { PracticePanel } from './PracticePanel'
import { ReviewPanel } from './ReviewPanel'
import { RhythmControls } from './RhythmControls'
import { SetupControls } from './SetupControls'
import { TabView } from './TabView'
import { usePractice } from './usePractice'

interface Props {
  tab: ParsedTab
  saved: SavedTab
  state: AppState
  dispatch: Dispatch<AppAction>
  onClearAll: () => void
}

const FRET_WINDOW = 4

export function PlayerScreen({ tab, saved, state, dispatch, onClearAll }: Props) {
  const { currentIndex, playing, stringFilter, prefs } = state
  const [player] = useState(() => new TabPlayer())
  const [audioError, setAudioError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [shareMessage, setShareMessage] = useState<string | null>(null)
  const [loadingSamples, setLoadingSamples] = useState(false)

  useEffect(() => {
    player.setLoadingListener(setLoadingSamples)
    return () => player.dispose()
  }, [player])

  useEffect(() => {
    player.setTimbre(prefs.timbre)
  }, [player, prefs.timbre])

  const setup: Setup = useMemo(() => ({ tuning: getTuning(saved.tuningId), capo: saved.capo }), [saved.tuningId, saved.capo])
  const event = tab.events[Math.min(currentIndex, tab.events.length - 1)]
  const visible = useMemo(() => visibleIndices(state), [state])
  const visiblePosition = visible.indexOf(currentIndex)
  const isHard = saved.hardEvents.includes(currentIndex)

  const displayedEvent = useMemo(
    () => (stringFilter === null ? event : { ...event, notes: event.notes.filter((n) => n.string === stringFilter) }),
    [event, stringFilter],
  )

  const fretRange = useMemo(() => {
    const frets = displayedEvent.notes.filter((n) => !n.muted).map((n) => n.fret).filter((f) => f > 0)
    const targets = displayedEvent.notes.map((n) => n.targetFret).filter((f): f is number => f !== undefined && f > 0)
    const all = [...frets, ...targets]
    if (!all.length) return { min: 1, max: FRET_WINDOW }
    const min = Math.max(1, Math.min(...all) - 1)
    return { min, max: Math.max(...all, min + FRET_WINDOW - 1) }
  }, [displayedEvent])

  const fingerSequence = useMemo(() => suggestFingersSequence(tab.events), [tab.events])
  const fingers = fingerSequence[currentIndex] ?? null

  const suggestions = useMemo(
    () => suggestReview(tab.events, saved.hardEvents, saved.practice),
    [tab.events, saved.hardEvents, saved.practice],
  )

  const unitsOf = (eventId: number) => eventUnits(saved.rhythm, eventId)

  async function playCurrent() {
    try {
      await player.playEvent(displayedEvent, saved.speed, setup, Math.min(unitsOf(event.id), 2))
      setAudioError(null)
    } catch {
      setAudioError('Não consegui iniciar o som. Toque na tela uma vez e tente de novo.')
    }
  }

  function stopPlayback() {
    player.pause()
    setCountdown(null)
    dispatch({ type: 'setPlaying', playing: false })
  }

  async function startPlayback() {
    const order = saved.loopEnabled
      ? visible.filter((id) => id >= saved.loopStart && id <= saved.loopEnd)
      : visible.filter((id) => id >= currentIndex)
    const fallback = saved.loopEnabled ? visible.filter((id) => id >= saved.loopStart && id <= saved.loopEnd) : visible
    dispatch({ type: 'setPlaying', playing: true })
    try {
      await player.playSequence({
        events: tab.events,
        order: order.length ? order : fallback,
        speed: saved.speed,
        loop: saved.loopEnabled,
        setup,
        unitsOf,
        countIn: prefs.countIn,
        onCountIn: (beats) => setCountdown(beats > 0 ? beats : null),
        onEvent: (index) => dispatch({ type: 'setIndex', index }),
        onFinish: () => {
          dispatch({ type: 'setPlaying', playing: false })
          // Ao terminar, volta ao começo para o próximo play tocar tudo de novo.
          dispatch({ type: 'setIndex', index: fallback[0] ?? 0 })
        },
      })
    } catch {
      setAudioError('Não consegui iniciar o som. Toque na tela uma vez e tente de novo.')
      dispatch({ type: 'setPlaying', playing: false })
    }
  }

  function togglePlay() {
    if (playing) stopPlayback()
    else void startPlayback()
  }

  function goPrev() {
    stopPlayback()
    dispatch({ type: 'prev' })
  }

  function goNext() {
    stopPlayback()
    dispatch({ type: 'next' })
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
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const practice = usePractice({
    event: displayedEvent,
    setup,
    onHit: (eventId) => dispatch({ type: 'recordPractice', eventId, hit: true }),
    onMiss: (eventId) => dispatch({ type: 'recordPractice', eventId, hit: false }),
    onAdvance: () => dispatch({ type: 'next' }),
  })

  const expectedNames = displayedEvent.notes.filter((n) => !n.muted).map((n) => fretToNoteName(n.string, n.fret, setup))

  async function share() {
    const url = buildShareUrl({ text: saved.text, tuningId: saved.tuningId, capo: saved.capo })
    try {
      if (navigator.share) {
        await navigator.share({ title: `Tab Fácil: ${saved.name}`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setShareMessage('Link copiado. Quem abrir vê esta tablatura com a mesma afinação e capo.')
    } catch {
      setShareMessage(`Copie o link: ${url}`)
    }
    setTimeout(() => setShareMessage(null), 6000)
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 pb-10">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Tab Fácil</h1>
          <p className="truncate text-sm text-muted">{saved.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void share()}>Compartilhar</Button>
          <Button onClick={() => dispatch({ type: 'go', screen: 'text' })}>Editar tablatura</Button>
          <Button onClick={() => dispatch({ type: 'reset' })}>Minhas tablaturas</Button>
        </div>
      </header>

      {state.notice && (
        <Alert tone="info">
          <div className="flex items-center justify-between gap-3">
            <span>{state.notice}</span>
            <Button variant="ghost" onClick={() => dispatch({ type: 'dismissNotice' })}>
              Fechar
            </Button>
          </div>
        </Alert>
      )}
      {shareMessage && <Alert tone="info">{shareMessage}</Alert>}
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
        <TabView
          tab={tab}
          currentIndex={currentIndex}
          hardEvents={saved.hardEvents}
          stringFilter={stringFilter}
          onSelect={(index) => {
            if (playing) stopPlayback()
            dispatch({ type: 'setIndex', index })
          }}
        />
        <p className="mt-3 text-xs text-muted">
          Toque em qualquer nota destacada para ir direto até ela. Notas em vermelho estão marcadas como difíceis.
        </p>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card title="O que fazer agora">
          {countdown !== null ? (
            <div role="status" aria-live="assertive" className="flex min-h-40 flex-col items-center justify-center">
              <p className="text-sm text-muted uppercase">Prepare a mão</p>
              <p className="text-6xl font-bold text-accent">{countdown}</p>
            </div>
          ) : (
            <InstructionCard
              event={displayedEvent}
              position={currentIndex + 1}
              total={tab.events.length}
              showPitches={prefs.viewPrefs.showPitches}
              setup={setup}
              isHard={isHard}
              section={tab.blocks[event.blockIndex]?.heading}
            />
          )}
        </Card>

        <Card
          title="Braço da guitarra"
          action={
            <label className="flex items-center gap-2 text-xs text-muted normal-case">
              <input
                type="checkbox"
                checked={prefs.viewPrefs.showFingers}
                onChange={(e) => dispatch({ type: 'setPref', key: 'showFingers', value: e.target.checked })}
                className="size-4 accent-[#f5b942]"
              />
              Sugerir dedo
            </label>
          }
        >
          <Fretboard
            event={displayedEvent}
            minFret={fretRange.min}
            maxFret={fretRange.max}
            fingers={fingers}
            showFingers={prefs.viewPrefs.showFingers}
            setup={setup}
            onPlayString={(s: StringNumber) => void player.playOpenString(s, setup).catch(() => setAudioError('Não consegui iniciar o som.'))}
          />
          <p className="mt-2 text-xs text-muted">
            Círculo vazado = corda solta. Círculo cheio = casa pressionada. X vermelho = corda abafada. Toque na
            letra da corda para ouvi-la solta.
            {prefs.viewPrefs.showFingers && fingers === null && displayedEvent.notes.some((n) => n.fret > 0) && ' Sem sugestão de dedo confiável para este trecho.'}
          </p>
        </Card>
      </div>

      <Card title="Controles">
        <Controls
          index={currentIndex}
          total={tab.events.length}
          visiblePosition={visiblePosition + 1}
          visibleTotal={visible.length}
          playing={playing}
          speed={saved.speed}
          loopEnabled={saved.loopEnabled}
          loopStart={saved.loopStart}
          loopEnd={saved.loopEnd}
          countIn={prefs.countIn}
          stringFilter={stringFilter}
          canPrev={visiblePosition > 0}
          canNext={visiblePosition < visible.length - 1}
          onPrev={goPrev}
          onNext={goNext}
          onPlayEvent={() => void playCurrent()}
          onTogglePlay={togglePlay}
          onRestart={() => {
            stopPlayback()
            dispatch({ type: 'setIndex', index: visible[0] ?? 0 })
          }}
          onSpeed={(speed) => dispatch({ type: 'setSpeed', speed })}
          onToggleLoop={() => dispatch({ type: 'toggleLoop' })}
          onSetLoopStart={() => dispatch({ type: 'setLoopStart' })}
          onSetLoopEnd={() => dispatch({ type: 'setLoopEnd' })}
          onCountIn={(value) => dispatch({ type: 'setCountIn', value })}
          onStringFilter={(string) => {
            stopPlayback()
            dispatch({ type: 'setStringFilter', string })
          }}
        />
        <p className="mt-3 text-xs text-muted">
          Atalhos: espaço toca ou pausa, seta direita avança, seta esquerda volta.
        </p>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card title="Ritmo e dificuldade">
          <RhythmControls
            eventId={currentIndex}
            rhythm={saved.rhythm}
            isHard={isHard}
            onDuration={(duration) => dispatch({ type: 'setDuration', duration })}
            onTogglePause={() => dispatch({ type: 'togglePause' })}
            onToggleHard={() => dispatch({ type: 'toggleHard' })}
          />
        </Card>

        <Card title="Afinação, capotraste e som">
          <SetupControls
            tuningId={saved.tuningId}
            capo={saved.capo}
            timbre={prefs.timbre}
            loadingSamples={loadingSamples}
            onTuning={(tuningId) => dispatch({ type: 'setTuning', tuningId })}
            onCapo={(capo) => dispatch({ type: 'setCapo', capo })}
            onTimbre={(timbre) => dispatch({ type: 'setTimbre', timbre })}
          />
        </Card>
      </div>

      <Card title="Praticar com escuta">
        <PracticePanel
          status={practice.status}
          reading={practice.reading}
          expected={expectedNames}
          error={practice.error}
          onToggle={() => {
            stopPlayback()
            practice.toggle()
          }}
        />
      </Card>

      <Card title="Revisão">
        <ReviewPanel
          suggestions={suggestions}
          practice={saved.practice}
          onPractice={(eventId) => {
            stopPlayback()
            const [start, end] = reviewRange(eventId, tab.events.length)
            dispatch({ type: 'setLoopRange', start, end })
          }}
        />
      </Card>

      <Card
        title="Como ler a tablatura"
        action={
          <Button variant="ghost" onClick={() => dispatch({ type: 'setPref', key: 'showLegend', value: !prefs.viewPrefs.showLegend })}>
            {prefs.viewPrefs.showLegend ? 'Esconder' : 'Mostrar'}
          </Button>
        }
      >
        {prefs.viewPrefs.showLegend ? (
          <Legend />
        ) : (
          <p className="text-sm text-muted">Guia rápido dos símbolos da tablatura e um aviso importante sobre ritmo.</p>
        )}
      </Card>

      <div className="flex justify-center pt-2">
        <Button variant="danger" onClick={onClearAll}>
          Apagar dados salvos
        </Button>
      </div>
    </div>
  )
}
