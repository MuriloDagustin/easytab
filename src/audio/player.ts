import type * as ToneType from 'tone'
import { DEFAULT_SETUP, fretToMidi, midiToNoteName, type Setup } from '../domain/music/tuning'
import type { Note, StringNumber, TabEvent, Technique } from '../domain/tab/types'
import { DEFAULT_BASE_MS } from '../domain/rhythm'
import { DEFAULT_TIMBRE, getInstrument, sampleUrls, samplesBaseUrl, type Timbre } from './instruments'
import { hitsAt, type DrumPattern } from './beat'
import { nearestSample, pitchPlan, playbackRate, toneColor, type Ramp } from './articulation'

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5] as const
export type Speed = (typeof SPEEDS)[number]

export const COUNT_IN_BEATS = 3

export interface SequenceOptions {
  events: TabEvent[]
  /** Ids dos eventos a tocar, em ordem. */
  order: number[]
  speed: number
  loop: boolean
  setup: Setup
  /** Duração relativa (1 = base) de cada evento, já incluindo pausa posterior. */
  unitsOf: (eventId: number) => number
  countIn: boolean
  metronome?: boolean
  drums?: DrumPattern
  /** Velocidade de cada volta do loop (treino de velocidade); sem isso, usa `speed`. */
  speedForLoop?: (loop: number) => number
  onLoop?: (loop: number, speed: number) => void
  onCountIn: (beatsLeft: number) => void
  onEvent: (index: number) => void
  onFinish: () => void
}

interface GlidePoint {
  time: number
  midi: number
  ramp: Ramp
}

/** Uma nota soando numa corda; a altura pode mudar sem novo ataque. */
interface Voice {
  glide(points: GlidePoint[]): void
  stop(time: number): void
}

interface Engine {
  start(midi: number, time: number, velocity: number, cutoff: number): Voice
  dispose(): void
}

interface StringState {
  voice: Voice
  midi: number
  timer: ReturnType<typeof setTimeout>
}

// Técnicas em que a nota seguinte na mesma corda sai da mesma vibração, sem palhetar.
const LEGATO: Technique[] = ['hammer-on', 'pull-off', 'slide-up', 'slide-down', 'bend', 'release', 'tapping']

function sampleEngine(Tone: typeof ToneType, buffers: ToneType.ToneAudioBuffers, notes: string[], output: ToneType.InputNode): Engine {
  const samples = notes.map((name) => ({ name, midi: Tone.Frequency(name).toMidi() }))
  const sampleMidis = samples.map((s) => s.midi)
  return {
    start(midi, time, velocity, cutoff) {
      const sampleMidi = nearestSample(midi, sampleMidis)
      const sample = samples.find((s) => s.midi === sampleMidi)!
      const source = new Tone.ToneBufferSource(buffers.get(sample.name))
      const filter = new Tone.Filter({ frequency: cutoff, type: 'lowpass', rolloff: -12 })
      const gain = new Tone.Gain(velocity)
      source.chain(filter, gain, output)
      source.playbackRate.setValueAtTime(playbackRate(midi, sampleMidi), time)
      source.start(time)
      let stopped = false
      return {
        glide(points) {
          for (const p of points) {
            const rate = playbackRate(p.midi, sampleMidi)
            if (p.ramp === 'linear') source.playbackRate.linearRampToValueAtTime(rate, p.time)
            else source.playbackRate.setValueAtTime(rate, p.time)
          }
        },
        stop(at) {
          if (stopped) return
          stopped = true
          gain.gain.cancelScheduledValues(at)
          gain.gain.setValueAtTime(gain.gain.getValueAtTime(at), at)
          gain.gain.linearRampToValueAtTime(0, at + 0.06)
          source.stop(at + 0.08)
          setTimeout(() => {
            source.dispose()
            filter.dispose()
            gain.dispose()
          }, Math.max(0, (at - Tone.now()) * 1000) + 300)
        },
      }
    },
    dispose() {
      buffers.dispose()
    },
  }
}

function synthEngine(Tone: typeof ToneType, output: ToneType.InputNode): Engine {
  return {
    start(midi, time, velocity) {
      const synth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.35, sustain: 0.25, release: 0.5 },
      }).connect(output)
      synth.volume.value = -8
      synth.triggerAttack(Tone.Frequency(midi, 'midi').toFrequency(), time, velocity)
      let stopped = false
      return {
        glide(points) {
          for (const p of points) {
            const freq = Tone.Frequency(p.midi, 'midi').toFrequency()
            if (p.ramp === 'linear') synth.frequency.linearRampToValueAtTime(freq, p.time)
            else synth.frequency.setValueAtTime(freq, p.time)
          }
        },
        stop(at) {
          if (stopped) return
          stopped = true
          synth.triggerRelease(at)
          setTimeout(() => synth.dispose(), Math.max(0, (at - Tone.now()) * 1000) + 1000)
        },
      }
    },
    dispose() {},
  }
}

/**
 * Reprodução com amostras reais de guitarra ou, como alternativa leve, um sintetizador.
 * Cada corda tem uma voz: uma nota nova na corda corta a anterior, e ligados (hammer-on,
 * pull-off, slide, bend) mudam a altura da mesma voz em vez de palhetar de novo.
 */
export class TabPlayer {
  private engines = new Map<Timbre, Engine>()
  private loading = new Map<Timbre, Promise<Engine>>()
  private strings = new Map<StringNumber, StringState>()
  private tone: typeof ToneType | null = null
  private output: ToneType.Gain | null = null
  private muteSynth: ToneType.NoiseSynth | null = null
  private click: ToneType.MembraneSynth | null = null
  private kick: ToneType.MembraneSynth | null = null
  private snare: ToneType.NoiseSynth | null = null
  private hat: ToneType.MetalSynth | null = null
  private vibrato: ToneType.Vibrato | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private gridTimer: ReturnType<typeof setTimeout> | null = null
  private started = false
  private generation = 0
  private timbre: Timbre = DEFAULT_TIMBRE
  private baseMs = DEFAULT_BASE_MS
  private unitQuarters = 1
  private beatsPerBar = 4
  private onLoading: ((loading: boolean) => void) | null = null

  /** Avisado quando as amostras de um timbre começam e terminam de carregar. */
  setLoadingListener(listener: ((loading: boolean) => void) | null): void {
    this.onLoading = listener
  }

  setTimbre(timbre: Timbre): void {
    this.timbre = timbre
  }

  /**
   * Duração da nota normal em ms a 1×, quanto ela vale em semínimas e quantos tempos
   * tem o compasso, para o metrônomo e a bateria seguirem o compasso real.
   */
  setTiming(unitMs: number, unitQuarters = 1, beatsPerBar = 4): void {
    this.baseMs = unitMs
    this.unitQuarters = unitQuarters
    this.beatsPerBar = beatsPerBar
  }

  private async ensureContext(): Promise<typeof ToneType> {
    const Tone = await import('tone')
    this.tone = Tone
    if (!this.started) {
      await Tone.start()
      this.started = true
    }
    if (!this.vibrato) {
      this.vibrato = new Tone.Vibrato({ frequency: 5.5, depth: 0 }).toDestination()
      this.output = new Tone.Gain(0.9).connect(this.vibrato)
      this.muteSynth = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.001, decay: 0.08, sustain: 0 } }).toDestination()
      this.muteSynth.volume.value = -14
      this.click = new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 4, envelope: { attack: 0.001, decay: 0.12, sustain: 0 } }).toDestination()
      this.click.volume.value = -6
      this.kick = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, envelope: { attack: 0.001, decay: 0.3, sustain: 0 } }).toDestination()
      this.kick.volume.value = -4
      this.snare = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.14, sustain: 0 } }).toDestination()
      this.snare.volume.value = -16
      this.hat = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
      }).toDestination()
      this.hat.volume.value = -30
    }
    return Tone
  }

  private async buildEngine(Tone: typeof ToneType, timbre: Timbre): Promise<Engine> {
    const output = this.output!
    if (timbre === 'synth') return synthEngine(Tone, output)
    const instrument = getInstrument(timbre)
    this.onLoading?.(true)
    try {
      const buffers = await new Promise<ToneType.ToneAudioBuffers>((resolve, reject) => {
        const b = new Tone.ToneAudioBuffers({
          urls: sampleUrls(instrument),
          baseUrl: samplesBaseUrl(instrument),
          onload: () => resolve(b),
          onerror: (error) => reject(error),
        })
      })
      return sampleEngine(Tone, buffers, instrument.notes, output)
    } finally {
      this.onLoading?.(false)
    }
  }

  private async ensureEngine(): Promise<Engine> {
    const Tone = await this.ensureContext()
    const wanted = this.timbre
    const ready = this.engines.get(wanted)
    if (ready) return ready
    let pending = this.loading.get(wanted)
    if (!pending) {
      pending = this.buildEngine(Tone, wanted).catch(async (error) => {
        // Sem as amostras (offline na primeira vez, arquivo faltando), cai no sintetizador.
        if (wanted === 'synth') throw error
        return this.buildEngine(Tone, 'synth')
      })
      this.loading.set(wanted, pending)
    }
    const engine = await pending
    this.loading.delete(wanted)
    this.engines.set(wanted, engine)
    return engine
  }

  eventDurationMs(speed: number, units = 1): number {
    return (this.baseMs * units) / speed
  }

  private stopString(string: StringNumber, at: number) {
    const state = this.strings.get(string)
    if (!state) return
    clearTimeout(state.timer)
    state.voice.stop(at)
    this.strings.delete(string)
  }

  private holdString(string: StringNumber, voice: Voice, midi: number, seconds: number) {
    const timer = setTimeout(() => {
      if (this.strings.get(string)?.voice === voice) this.strings.delete(string)
      voice.stop(this.tone?.now() ?? 0)
    }, seconds * 1000)
    this.strings.set(string, { voice, midi, timer })
  }

  async playOpenString(string: StringNumber, setup: Setup = DEFAULT_SETUP): Promise<void> {
    const engine = await this.ensureEngine()
    const now = this.tone!.now() + 0.01
    if (this.vibrato) this.vibrato.depth.value = 0
    this.stopString(string, now)
    const voice = engine.start(fretToMidi(string, 0, setup), now, 0.9, toneColor(string, 0))
    this.holdString(string, voice, fretToMidi(string, 0, setup), 2.2)
  }

  private velocityFor(note: Note): number {
    if (note.arrivedBy === 'hammer-on' || note.arrivedBy === 'pull-off' || note.arrivedBy === 'tapping') return 0.55
    if (note.palmMute) return 0.6
    return 0.85
  }

  async playEvent(event: TabEvent, speed = 1, setup: Setup = DEFAULT_SETUP, units = 1): Promise<void> {
    const engine = await this.ensureEngine()
    const now = this.tone!.now() + 0.01
    const seconds = this.eventDurationMs(speed, units) / 1000
    const hasVibrato = event.notes.some((n) => n.techniques.includes('vibrato'))
    if (this.vibrato) this.vibrato.depth.value = hasVibrato ? 0.4 : 0
    if (event.notes.some((n) => n.muted)) this.muteSynth?.triggerAttackRelease(0.08, now)

    for (const note of event.notes) {
      if (note.muted) {
        this.stopString(note.string, now)
        continue
      }
      const midi = fretToMidi(note.string, note.fret, setup)
      const active = this.strings.get(note.string)
      let voice: Voice
      if (note.arrivedBy && LEGATO.includes(note.arrivedBy) && active) {
        clearTimeout(active.timer)
        voice = active.voice
        if (active.midi !== midi) voice.glide([{ time: now, midi, ramp: 'step' }])
      } else {
        this.stopString(note.string, now)
        voice = engine.start(midi, now, this.velocityFor(note), toneColor(note.string, note.fret))
      }

      const plan = pitchPlan(note, midi, seconds)
      voice.glide(plan.points.map((p) => ({ time: now + p.at, midi: p.midi, ramp: p.ramp })))
      const endMidi = plan.points.at(-1)?.midi ?? midi
      const linksToNext = note.targetFret !== undefined && note.techniques.some((t) => LEGATO.includes(t))
      const hold = note.palmMute
        ? Math.min(seconds, 0.22)
        : plan.fadeOut
          ? seconds
          : linksToNext
            ? seconds + 1.5
            : seconds + 0.25
      this.holdString(note.string, voice, endMidi, hold)
    }
  }

  private playClick(accent: boolean) {
    this.click?.triggerAttackRelease(accent ? 'C5' : 'G4', 0.08)
  }

  private startGrid(generation: number, speedRef: { value: number }, metronome: boolean, drums: DrumPattern) {
    if (!metronome && drums === 'off') return
    let eighth = 0
    const started = performance.now()
    let elapsed = 0
    const tick = () => {
      if (generation !== this.generation) return
      const hits = hitsAt(eighth, drums, metronome, this.beatsPerBar)
      if (hits.click) this.playClick(hits.accent)
      if (hits.kick) this.kick?.triggerAttackRelease('C1', 0.2)
      if (hits.snare) this.snare?.triggerAttackRelease(0.12)
      if (hits.hat) this.hat?.triggerAttackRelease('C6', 0.03, undefined, hits.accent ? 0.5 : 0.3)
      eighth++
      // Agenda pelo relógio acumulado para a grade não escorregar com os atrasos do setTimeout.
      const beat = this.eventDurationMs(speedRef.value) / this.unitQuarters
      elapsed += beat / 2
      this.gridTimer = setTimeout(tick, Math.max(0, started + elapsed - performance.now()))
    }
    tick()
  }

  async playSequence(options: SequenceOptions): Promise<void> {
    await this.ensureEngine()
    this.stopTimer()
    const generation = ++this.generation
    const { events, order, loop, setup, unitsOf, countIn, onCountIn, onEvent, onFinish } = options
    if (!order.length) {
      onFinish()
      return
    }
    const speed = { value: options.speedForLoop ? options.speedForLoop(0) : options.speed }
    if (options.speedForLoop) options.onLoop?.(0, speed.value)

    let position = 0
    let loopCount = 0
    const step = async () => {
      if (generation !== this.generation) return
      if (position >= order.length) {
        if (loop) {
          position = 0
          loopCount++
          if (options.speedForLoop) {
            speed.value = options.speedForLoop(loopCount)
            options.onLoop?.(loopCount, speed.value)
          }
        } else {
          this.stopGrid()
          onFinish()
          return
        }
      }
      const eventId = order[position]
      const units = unitsOf(eventId)
      onEvent(eventId)
      await this.playEvent(events[eventId], speed.value, setup, units)
      position += 1
      this.timer = setTimeout(step, this.eventDurationMs(speed.value, units))
    }

    if (countIn) {
      const beatMs = this.eventDurationMs(speed.value) / this.unitQuarters
      for (let beat = COUNT_IN_BEATS; beat >= 1; beat--) {
        if (generation !== this.generation) return
        onCountIn(beat)
        this.playClick(beat === 1)
        await new Promise<void>((resolve) => {
          this.timer = setTimeout(resolve, beatMs)
        })
      }
      onCountIn(0)
    }
    if (generation !== this.generation) return
    this.startGrid(generation, speed, options.metronome ?? false, options.drums ?? 'off')
    await step()
  }

  private stopGrid() {
    if (this.gridTimer) {
      clearTimeout(this.gridTimer)
      this.gridTimer = null
    }
  }

  private stopTimer() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  pause(): void {
    this.generation++
    this.stopTimer()
    this.stopGrid()
    const now = this.tone?.now() ?? 0
    for (const string of [...this.strings.keys()]) this.stopString(string, now)
  }

  dispose(): void {
    this.pause()
    this.engines.forEach((e) => e.dispose())
    this.engines.clear()
    for (const node of [this.vibrato, this.output, this.muteSynth, this.click, this.kick, this.snare, this.hat]) node?.dispose()
    this.vibrato = null
    this.output = null
    this.muteSynth = null
    this.click = null
    this.kick = null
    this.snare = null
    this.hat = null
  }
}

export { midiToNoteName }
