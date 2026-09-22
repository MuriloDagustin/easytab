import type * as ToneType from 'tone'
import { DEFAULT_SETUP, fretToFrequency, fretToMidi, midiToNoteName, type Setup } from '../domain/music/tuning'
import type { Note, StringNumber, TabEvent } from '../domain/tab/types'
import { DEFAULT_TIMBRE, getInstrument, sampleUrls, samplesBaseUrl, type Timbre } from './instruments'
import { hitsAt, type DrumPattern } from './beat'

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5] as const
export type Speed = (typeof SPEEDS)[number]

import { DEFAULT_BASE_MS } from '../domain/rhythm'

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

interface Voice {
  trigger(notes: string[], seconds: number, velocity: number): void
  releaseAll(): void
  dispose(): void
}

/**
 * Reprodução com amostras reais de guitarra (Tone.Sampler) ou, como alternativa
 * leve, um sintetizador simples. A duração base é igual para todo evento, porque
 * tablatura em texto não carrega ritmo; o usuário ajusta durações manualmente.
 */
export class TabPlayer {
  /** Um conjunto de vozes por timbre, mantido em memória para trocar sem baixar de novo. */
  private voices = new Map<Timbre, Voice>()
  private loading = new Map<Timbre, Promise<Voice>>()
  private muteSynth: ToneType.NoiseSynth | null = null
  private click: ToneType.MembraneSynth | null = null
  private kick: ToneType.MembraneSynth | null = null
  private snare: ToneType.NoiseSynth | null = null
  private hat: ToneType.MetalSynth | null = null
  private gridTimer: ReturnType<typeof setTimeout> | null = null
  private baseMs = DEFAULT_BASE_MS
  private vibrato: ToneType.Vibrato | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private started = false
  private generation = 0
  private timbre: Timbre = DEFAULT_TIMBRE

  private onLoading: ((loading: boolean) => void) | null = null

  /** Avisado quando as amostras de um timbre começam e terminam de carregar. */
  setLoadingListener(listener: ((loading: boolean) => void) | null): void {
    this.onLoading = listener
  }

  setTimbre(timbre: Timbre): void {
    this.timbre = timbre
  }

  /** Duração da unidade de ritmo em ms a 1×; vem do ritmo gravado quando existe. */
  setBaseMs(ms: number): void {
    this.baseMs = ms
  }

  private async ensureContext() {
    const Tone = await import('tone')
    if (!this.started) {
      await Tone.start()
      this.started = true
    }
    if (!this.vibrato) {
      this.vibrato = new Tone.Vibrato({ frequency: 5.5, depth: 0 }).toDestination()
      this.muteSynth = new Tone.NoiseSynth({
        noise: { type: 'brown' },
        envelope: { attack: 0.001, decay: 0.08, sustain: 0 },
      }).toDestination()
      this.muteSynth.volume.value = -14
      this.click = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 4,
        envelope: { attack: 0.001, decay: 0.12, sustain: 0 },
      }).toDestination()
      this.click.volume.value = -6
      this.kick = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, envelope: { attack: 0.001, decay: 0.3, sustain: 0 } }).toDestination()
      this.kick.volume.value = -4
      this.snare = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.14, sustain: 0 } }).toDestination()
      this.snare.volume.value = -16
      this.hat = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.05, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination()
      this.hat.volume.value = -30
    }
    return Tone
  }

  private async buildVoice(Tone: typeof ToneType, timbre: Timbre): Promise<Voice> {
    const output = this.vibrato!
    if (timbre === 'synth') {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.35, sustain: 0.12, release: 0.9 },
      }).connect(output)
      synth.volume.value = -8
      return {
        trigger: (notes, seconds, velocity) => synth.triggerAttackRelease(notes, seconds, undefined, velocity),
        releaseAll: () => synth.releaseAll(),
        dispose: () => synth.dispose(),
      }
    }

    const instrument = getInstrument(timbre)
    this.onLoading?.(true)
    try {
      const sampler = await new Promise<ToneType.Sampler>((resolve, reject) => {
        const s = new Tone.Sampler({
          urls: sampleUrls(instrument),
          baseUrl: samplesBaseUrl(instrument),
          release: 0.5,
          onload: () => resolve(s),
          onerror: (error) => reject(error),
        }).connect(output)
      })
      sampler.volume.value = -2
      return {
        trigger: (notes, seconds, velocity) => sampler.triggerAttackRelease(notes, seconds, undefined, velocity),
        releaseAll: () => sampler.releaseAll(),
        dispose: () => sampler.dispose(),
      }
    } finally {
      this.onLoading?.(false)
    }
  }

  private async ensureVoice(): Promise<Voice> {
    const Tone = await this.ensureContext()
    const wanted = this.timbre
    const ready = this.voices.get(wanted)
    if (ready) return ready
    let pending = this.loading.get(wanted)
    if (!pending) {
      pending = this.buildVoice(Tone, wanted).catch(async (error) => {
        // Sem as amostras (offline na primeira vez, arquivo faltando), cai no sintetizador.
        if (wanted === 'synth') throw error
        return this.buildVoice(Tone, 'synth')
      })
      this.loading.set(wanted, pending)
    }
    const voice = await pending
    this.loading.delete(wanted)
    this.voices.set(wanted, voice)
    return voice
  }

  private get voice(): Voice | null {
    return this.voices.get(this.timbre) ?? null
  }

  eventDurationMs(speed: number, units = 1): number {
    return (this.baseMs * units) / speed
  }

  async playOpenString(string: StringNumber, setup: Setup = DEFAULT_SETUP): Promise<void> {
    const voice = await this.ensureVoice()
    if (this.vibrato) this.vibrato.depth.value = 0
    voice.trigger([midiToNoteName(fretToMidi(string, 0, setup))], 2.2, 0.9)
  }

  private velocityFor(note: Note): number {
    if (note.arrivedBy === 'hammer-on' || note.arrivedBy === 'pull-off' || note.arrivedBy === 'tapping') return 0.55
    if (note.palmMute) return 0.6
    return 0.85
  }

  async playEvent(event: TabEvent, speed = 1, setup: Setup = DEFAULT_SETUP, units = 1): Promise<void> {
    const voice = await this.ensureVoice()
    const durationMs = this.eventDurationMs(speed, units)
    const seconds = (durationMs / 1000) * 0.95
    const hasVibrato = event.notes.some((n) => n.techniques.includes('vibrato'))
    if (this.vibrato) this.vibrato.depth.value = hasVibrato ? 0.4 : 0

    const sounding = event.notes.filter((n) => !n.muted)
    if (sounding.length < event.notes.length) this.muteSynth?.triggerAttackRelease(0.08)
    if (!sounding.length) return

    const held = sounding.filter((n) => !n.arrivedBy || ['hammer-on', 'pull-off', 'tapping'].includes(n.arrivedBy))
    const notes = held.length ? held : sounding
    const names = notes.map((n) => midiToNoteName(fretToMidi(n.string, n.fret, setup)))
    const palmMuted = notes.some((n) => n.palmMute)
    const velocity = Math.min(...notes.map((n) => this.velocityFor(n)))
    voice.trigger(names, palmMuted ? Math.min(seconds, 0.22) : seconds, velocity)

    const gliding = sounding.find(
      (n) => n.targetFret !== undefined && n.techniques.some((t) => ['slide-up', 'slide-down', 'bend', 'release'].includes(t)),
    )
    if (gliding?.targetFret !== undefined) {
      const target = midiToNoteName(fretToMidi(gliding.string, gliding.targetFret, setup))
      // Amostras não deslizam de altura; um segundo toque mais suave indica o destino.
      setTimeout(() => voice.trigger([target], seconds * 0.5, 0.5), durationMs * 0.5)
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
      const hits = hitsAt(eighth, drums, metronome)
      if (hits.click) this.playClick(hits.accent)
      if (hits.kick) this.kick?.triggerAttackRelease('C1', 0.2)
      if (hits.snare) this.snare?.triggerAttackRelease(0.12)
      if (hits.hat) this.hat?.triggerAttackRelease('C6', 0.03, undefined, hits.accent ? 0.5 : 0.3)
      eighth++
      // Agenda pelo relógio acumulado para a grade não escorregar com os atrasos do setTimeout.
      elapsed += this.eventDurationMs(speedRef.value) / 2
      this.gridTimer = setTimeout(tick, Math.max(0, started + elapsed - performance.now()))
    }
    tick()
  }

  async playSequence(options: SequenceOptions): Promise<void> {
    await this.ensureVoice()
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
      await this.playEvent(events[eventId], speed.value, setup, Math.min(units, 2))
      position += 1
      this.timer = setTimeout(step, this.eventDurationMs(speed.value, units))
    }

    if (countIn) {
      const beatMs = this.eventDurationMs(speed.value)
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
    this.voice?.releaseAll()
  }

  dispose(): void {
    this.pause()
    this.voices.forEach((v) => v.dispose())
    this.voices.clear()
    this.vibrato?.dispose()
    this.muteSynth?.dispose()
    this.click?.dispose()
    this.kick?.dispose()
    this.snare?.dispose()
    this.hat?.dispose()
    this.kick = null
    this.snare = null
    this.hat = null
    this.vibrato = null
    this.muteSynth = null
    this.click = null
  }
}

export { fretToFrequency }
