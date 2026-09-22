import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch } from 'react'
import { TabPlayer } from '../../audio/player'
import { suggestFingersSequence } from '../../domain/fingering/suggest'
import { alternatePositions, type Position } from '../../domain/music/positions'
import { chordPitchClasses } from '../../domain/music/chords'
import { detectKey } from '../../domain/music/keys'
import { fretToMidi, fretToNoteName, getTuning, tuningLowToHigh, type Setup } from '../../domain/music/tuning'
import { UNIT_QUARTERS, effectiveBpm, unitMs } from '../../domain/meter'
import { reviewRange, suggestReview } from '../../domain/review'
import { eventUnits, noteUnits, rhythmFromTaps } from '../../domain/rhythm'
import { speedForLoop } from '../../domain/speedTrainer'
import { currentStreak, dayKey } from '../../domain/streak'
import { orderFrom, playbackOrder } from '../../domain/tab/playback'
import type { ParsedTab, StringNumber } from '../../domain/tab/types'
import { buildShareUrl } from '../../share/url'
import { visibleIndices, type AppAction, type AppState } from '../../state/appReducer'
import type { SavedTab } from '../../storage/persistence'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { ChordDialog } from './ChordDiagram'
import { Controls } from './Controls'
import { Fretboard } from './Fretboard'
import { InstructionCard } from './InstructionCard'
import { Legend } from './Legend'
import { PracticePanel } from './PracticePanel'
import { ReviewPanel } from './ReviewPanel'
import { RhythmControls } from './RhythmControls'
import { SetupControls } from './SetupControls'
import { TabGraphic } from './TabGraphic'
import { TabView } from './TabView'
import { TransportBar } from './TransportBar'
import { Tuner } from './Tuner'
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
  const [trainerSpeed, setTrainerSpeed] = useState<number | null>(null)
  const [openChord, setOpenChord] = useState<string | null>(null)
  const [recording, setRecording] = useState<{ order: number[]; tapped: number } | null>(null)
  const taps = useRef<number[]>([])

  useEffect(() => {
    player.setLoadingListener(setLoadingSamples)
    return () => player.dispose()
  }, [player])

  useEffect(() => {
    player.setTimbre(prefs.timbre)
  }, [player, prefs.timbre])

  useEffect(() => {
    player.setTiming(unitMs(saved.meter, saved.rhythm), UNIT_QUARTERS[saved.meter.unit], saved.meter.beats)
  }, [player, saved.meter, saved.rhythm])

  const setup: Setup = useMemo(() => ({ tuning: getTuning(saved.tuningId), capo: saved.capo }), [saved.tuningId, saved.capo])
  const event = tab.events[Math.min(currentIndex, tab.events.length - 1)]
  const visible = useMemo(() => visibleIndices(state), [state])
  const visiblePosition = visible.indexOf(currentIndex)
  const isHard = saved.hardEvents.includes(currentIndex)

  const displayedEvent = useMemo(
    () => (stringFilter === null ? event : { ...event, notes: event.notes.filter((n) => n.string === stringFilter) }),
    [event, stringFilter],
  )

  const alternates: Position[] = useMemo(() => {
    if (!prefs.viewPrefs.showAlternates) return []
    const current = new Set(displayedEvent.notes.map((n) => `${n.string}:${n.fret}`))
    const seen = new Set<string>()
    return displayedEvent.notes
      .filter((n) => !n.muted)
      .flatMap((n) => alternatePositions(n.string, n.fret, setup))
      .filter((p) => {
        const key = `${p.string}:${p.fret}`
        if (current.has(key) || seen.has(key)) return false
        seen.add(key)
        return true
      })
  }, [displayedEvent, setup, prefs.viewPrefs.showAlternates])

  const fretRange = useMemo(() => {
    if (prefs.viewPrefs.showAlternates) {
      const max = Math.max(15, ...displayedEvent.notes.map((n) => n.fret))
      return { min: 1, max }
    }
    const frets = displayedEvent.notes.filter((n) => !n.muted).map((n) => n.fret).filter((f) => f > 0)
    const targets = displayedEvent.notes.map((n) => n.targetFret).filter((f): f is number => f !== undefined && f > 0)
    const all = [...frets, ...targets]
    if (!all.length) return { min: 1, max: FRET_WINDOW }
    const min = Math.max(1, Math.min(...all) - 1)
    return { min, max: Math.max(...all, min + FRET_WINDOW - 1) }
  }, [displayedEvent, prefs.viewPrefs.showAlternates])

  const hasRepeats = tab.blocks.some((b) => b.sectionRepeat || b.repeat || b.jumpsBefore) || Boolean(tab.jumpsAtEnd)
  const key = useMemo(
    () =>
      detectKey(
        tab.events.flatMap((e) => e.notes.filter((n) => !n.muted).map((n) => fretToMidi(n.string, n.fret, setup))),
        tab.events.flatMap((e) => (e.chord ? chordPitchClasses(e.chord) : [])),
      ),
    [tab.events, setup],
  )
  const hasRhythm =
    Boolean(saved.rhythm.recorded) || Object.keys(saved.rhythm.durations).length > 0 || saved.rhythm.pausesAfter.length > 0
  const quartersOf = hasRhythm ? (id: number) => noteUnits(saved.rhythm, id) * UNIT_QUARTERS[saved.meter.unit] : null
  const bpm = effectiveBpm(saved.meter, saved.rhythm)
  const bpmSource = saved.meter.bpm !== null ? 'manual' : saved.rhythm.recorded ? 'recorded' : 'default'
  const streak = currentStreak(prefs.practiceDays, dayKey(new Date()))

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
    setTrainerSpeed(null)
    dispatch({ type: 'setPlaying', playing: false })
  }

  async function startPlayback() {
    const visibleSet = new Set(visible)
    const trainer = prefs.speedTrainer.enabled
    const inLoop = visible.filter((id) => id >= saved.loopStart && id <= saved.loopEnd)
    const full = playbackOrder(tab, (id) => visibleSet.has(id), prefs.playRepeats)
    let order: number[]
    let fallback: number[]
    if (saved.loopEnabled) {
      order = inLoop
      fallback = inLoop
    } else if (trainer) {
      order = full
      fallback = full
    } else {
      order = orderFrom(full, currentIndex)
      fallback = full
    }
    dispatch({ type: 'setPlaying', playing: true })
    dispatch({ type: 'markPracticeDay' })
    try {
      await player.playSequence({
        events: tab.events,
        order: order.length ? order : fallback,
        speed: saved.speed,
        loop: saved.loopEnabled || trainer,
        setup,
        unitsOf,
        countIn: prefs.countIn,
        metronome: prefs.metronome,
        drums: prefs.drums,
        speedForLoop: trainer ? (loop) => speedForLoop(prefs.speedTrainer, loop) : undefined,
        onLoop: (_, speed) => setTrainerSpeed(speed),
        onCountIn: (beats) => setCountdown(beats > 0 ? beats : null),
        onEvent: (index) => dispatch({ type: 'setIndex', index }),
        onFinish: () => {
          setTrainerSpeed(null)
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

  function startRecording() {
    stopPlayback()
    const order = saved.loopEnabled
      ? visible.filter((id) => id >= saved.loopStart && id <= saved.loopEnd)
      : visible.filter((id) => id >= currentIndex)
    if (order.length < 2) return
    taps.current = []
    setRecording({ order, tapped: 0 })
    dispatch({ type: 'setIndex', index: order[0] })
  }

  const finishRecording = useCallback(
    (order: number[]) => {
      const recorded = rhythmFromTaps(order, taps.current)
      setRecording(null)
      taps.current = []
      if (recorded) {
        dispatch({ type: 'recordRhythm', recorded })
        dispatch({ type: 'markPracticeDay' })
      }
      dispatch({ type: 'setIndex', index: order[0] })
    },
    [dispatch],
  )

  function tap() {
    if (!recording) return
    taps.current.push(performance.now())
    const tapped = taps.current.length
    if (tapped >= recording.order.length) {
      finishRecording(recording.order)
      return
    }
    setRecording({ ...recording, tapped })
    dispatch({ type: 'setIndex', index: recording.order[tapped] })
  }

  function cancelRecording() {
    taps.current = []
    setRecording(null)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (openChord) return
      if (recording) {
        if (e.code === 'Space') {
          e.preventDefault()
          tap()
        } else if (e.key === 'Escape') {
          cancelRecording()
        }
        return
      }
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4">
      <header className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Tab Fácil</h1>
          <p className="truncate text-sm text-muted">
            {saved.name}
            {streak > 0 && <span className="ml-2 text-accent-strong">🔥 {streak} dia{streak > 1 ? 's' : ''} seguido{streak > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void share()}>Compartilhar</Button>
          <Button onClick={() => dispatch({ type: 'go', screen: 'text' })}>Editar tablatura</Button>
          <Button onClick={() => dispatch({ type: 'reset' })}>Minhas tablaturas</Button>
        </div>
      </header>

      <div className="flex flex-col gap-4 empty:hidden print:hidden">
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
      </div>

      <Card
        className="print-area"
        title="Tablatura"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
          {prefs.viewPrefs.tabStyle === 'graphic' && (
            <label className="flex items-center gap-1.5 text-xs text-muted normal-case">
              <input
                type="checkbox"
                checked={prefs.viewPrefs.showNotation}
                onChange={(e) => dispatch({ type: 'setPref', key: 'showNotation', value: e.target.checked })}
                className="size-4 accent-[#f5b942]"
              />
              Partitura
            </label>
          )}
          <Button variant="ghost" className="min-h-8! px-2! py-1! text-xs" onClick={() => window.print()}>
            Imprimir
          </Button>
          <div role="radiogroup" aria-label="Estilo da tablatura" className="inline-flex rounded-lg border border-border p-0.5">
            {(['graphic', 'text'] as const).map((style) => (
              <button
                key={style}
                role="radio"
                aria-checked={prefs.viewPrefs.tabStyle === style}
                onClick={() => dispatch({ type: 'setTabStyle', style })}
                className={`min-h-8 rounded-md px-2.5 text-xs transition-colors ${
                  prefs.viewPrefs.tabStyle === style ? 'bg-accent font-semibold text-accent-ink' : 'text-muted hover:text-text'
                }`}
              >
                {style === 'graphic' ? 'Visual' : 'Texto'}
              </button>
            ))}
          </div>
          </div>
        }
      >
        <div className="mb-3 hidden print:block" aria-hidden>
          <p className="text-xl font-bold">{saved.name}</p>
          <p className="text-sm">
            Afinação: {setup.tuning.name}
            {setup.capo > 0 && ` · capotraste na casa ${setup.capo}`}
          </p>
        </div>
        {prefs.viewPrefs.tabStyle === 'graphic' ? (
          <TabGraphic
            tab={tab}
            currentIndex={currentIndex}
            hardEvents={saved.hardEvents}
            stringFilter={stringFilter}
            setup={setup}
            showNotation={prefs.viewPrefs.showNotation}
            fifths={key.fifths}
            keyName={key.name}
            quartersOf={quartersOf}
            onChord={setOpenChord}
            onSelect={(index) => {
              if (playing) stopPlayback()
              dispatch({ type: 'setIndex', index })
            }}
          />
        ) : (
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
        )}
        <p className="mt-3 text-xs text-muted print:hidden">
          Toque em qualquer nota para ir direto até ela. Notas em vermelho estão marcadas como difíceis. Toque numa
          cifra para ver a forma do acorde.
        </p>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2 print:hidden">
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
              onChord={setOpenChord}
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
            leftHanded={prefs.viewPrefs.leftHanded}
            alternates={alternates}
            onPlayString={(s: StringNumber) => void player.playOpenString(s, setup).catch(() => setAudioError('Não consegui iniciar o som.'))}
          />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <label className="flex min-h-8 items-center gap-1.5">
              <input
                type="checkbox"
                checked={prefs.viewPrefs.leftHanded}
                onChange={(e) => dispatch({ type: 'setPref', key: 'leftHanded', value: e.target.checked })}
                className="size-4 accent-[#f5b942]"
              />
              Canhoto
            </label>
            <label className="flex min-h-8 items-center gap-1.5">
              <input
                type="checkbox"
                checked={prefs.viewPrefs.showAlternates}
                onChange={(e) => dispatch({ type: 'setPref', key: 'showAlternates', value: e.target.checked })}
                className="size-4 accent-[#f5b942]"
              />
              Mostrar a mesma nota em outras posições
            </label>
          </div>
          {prefs.viewPrefs.showAlternates && (
            <p className="mt-1 text-xs text-string">
              {alternates.length
                ? `Círculos tracejados: mesma nota em ${alternates.map((p) => `${p.string}ª corda casa ${p.fret}`).join(', ')}.`
                : 'Esta nota não aparece em outra posição até a casa 15.'}
            </p>
          )}
          <p className="mt-2 text-xs text-muted">
            Círculo vazado = corda solta. Círculo cheio = casa pressionada. X vermelho = corda abafada. Toque na
            letra da corda para ouvi-la solta.
            {prefs.viewPrefs.showFingers && fingers === null && displayedEvent.notes.some((n) => n.fret > 0) && ' Sem sugestão de dedo confiável para este trecho.'}
          </p>
        </Card>
      </div>

      <Card title="Reprodução" className="print:hidden">
        <Controls
          visiblePosition={visiblePosition + 1}
          visibleTotal={visible.length}
          loopEnabled={saved.loopEnabled}
          loopStart={saved.loopStart}
          loopEnd={saved.loopEnd}
          countIn={prefs.countIn}
          stringFilter={stringFilter}
          onRestart={() => {
            stopPlayback()
            dispatch({ type: 'setIndex', index: visible[0] ?? 0 })
          }}
          onToggleLoop={() => dispatch({ type: 'toggleLoop' })}
          onSetLoopStart={() => dispatch({ type: 'setLoopStart' })}
          onSetLoopEnd={() => dispatch({ type: 'setLoopEnd' })}
          onCountIn={(value) => dispatch({ type: 'setCountIn', value })}
          onStringFilter={(string) => {
            stopPlayback()
            dispatch({ type: 'setStringFilter', string })
          }}
          metronome={prefs.metronome}
          drums={prefs.drums}
          playRepeats={prefs.playRepeats}
          hasRepeats={hasRepeats}
          trainer={prefs.speedTrainer}
          onMetronome={(value) => dispatch({ type: 'setMetronome', value })}
          onDrums={(pattern) => dispatch({ type: 'setDrums', pattern })}
          onPlayRepeats={(value) => dispatch({ type: 'setPlayRepeats', value })}
          onTrainer={(patch) => dispatch({ type: 'setSpeedTrainer', patch })}
          meter={saved.meter}
          bpm={bpm}
          bpmSource={bpmSource}
          onMeter={(patch) => dispatch({ type: 'setMeter', patch })}
        />
        <p className="mt-3 text-xs text-muted">
          Atalhos: espaço toca ou pausa, seta direita avança, seta esquerda volta.
        </p>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2 print:hidden">
        <Card title="Ritmo e dificuldade">
          <RhythmControls
            eventId={currentIndex}
            rhythm={saved.rhythm}
            isHard={isHard}
            onDuration={(duration) => dispatch({ type: 'setDuration', duration })}
            onTogglePause={() => dispatch({ type: 'togglePause' })}
            onToggleHard={() => dispatch({ type: 'toggleHard' })}
            recording={recording !== null}
            onStartRecording={startRecording}
            onClearRecorded={() => dispatch({ type: 'clearRecordedRhythm' })}
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
          <div className="mt-4">
            <Tuner setup={setup} />
          </div>
        </Card>
      </div>

      <Card title="Praticar com escuta" className="print:hidden">
        <PracticePanel
          status={practice.status}
          reading={practice.reading}
          expected={expectedNames}
          error={practice.error}
          session={practice.session}
          onToggle={() => {
            stopPlayback()
            practice.toggle()
          }}
        />
      </Card>

      <Card title="Revisão" className="print:hidden">
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
        className="print:hidden"
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

      <div className="flex justify-center pt-2 print:hidden">
        <Button variant="danger" onClick={onClearAll}>
          Apagar dados salvos
        </Button>
      </div>

      <TransportBar
        index={currentIndex}
        total={tab.events.length}
        playing={playing}
        speed={saved.speed}
        canPrev={visiblePosition > 0}
        canNext={visiblePosition < visible.length - 1}
        onPrev={goPrev}
        onNext={goNext}
        onPlayEvent={() => void playCurrent()}
        onTogglePlay={togglePlay}
        onSpeed={(speed) => dispatch({ type: 'setSpeed', speed })}
        trainerSpeed={trainerSpeed}
        recording={
          recording && {
            tapped: recording.tapped,
            total: recording.order.length,
            onTap: tap,
            onFinish: () => finishRecording(recording.order),
            onCancel: cancelRecording,
          }
        }
      />

      {openChord && (
        <ChordDialog
          name={openChord}
          leftHanded={prefs.viewPrefs.leftHanded}
          tuning={tuningLowToHigh(setup.tuning)}
          tuningName={setup.tuning.name}
          capo={setup.capo}
          onClose={() => setOpenChord(null)}
        />
      )}
    </div>
  )
}
