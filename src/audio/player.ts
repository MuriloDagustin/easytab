import type * as ToneType from 'tone'
import { DEFAULT_SETUP, fretToFrequency, type Setup } from '../domain/music/tuning'
import type { StringNumber, TabEvent } from '../domain/tab/types'

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5] as const
export type Speed = (typeof SPEEDS)[number]

const BASE_EVENT_MS = 620
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
  onCountIn: (beatsLeft: number) => void
  onEvent: (index: number) => void
  onFinish: () => void
}

/**
 * Reprodução simples: a duração base é igual para todo evento, porque tablatura em
 * texto não carrega ritmo. O usuário pode ajustar durações manualmente.
 */
export class TabPlayer {
  private synth: ToneType.PolySynth<ToneType.Synth> | null = null
  private muteSynth: ToneType.NoiseSynth | null = null
  private click: ToneType.MembraneSynth | null = null
  private vibrato: ToneType.Vibrato | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private started = false
  private generation = 0

  private async ensureAudio(): Promise<ToneType.PolySynth<ToneType.Synth>> {
    // Tone.js só é baixado quando o usuário pede som pela primeira vez.
    const Tone = await import('tone')
    if (!this.started) {
      await Tone.start()
      this.started = true
    }
    if (!this.synth) {
      this.vibrato = new Tone.Vibrato({ frequency: 5.5, depth: 0 }).toDestination()
      this.synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.35, sustain: 0.12, release: 0.9 },
      }).connect(this.vibrato)
      this.synth.volume.value = -8
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
    }
    return this.synth
  }

  eventDurationMs(speed: number, units = 1): number {
    return (BASE_EVENT_MS * units) / speed
  }

  async playOpenString(string: StringNumber, setup: Setup = DEFAULT_SETUP): Promise<void> {
    const synth = await this.ensureAudio()
    if (this.vibrato) this.vibrato.depth.value = 0
    synth.triggerAttackRelease([fretToFrequency(string, 0, setup)], 1.6)
  }

  async playEvent(event: TabEvent, speed = 1, setup: Setup = DEFAULT_SETUP, units = 1): Promise<void> {
    const synth = await this.ensureAudio()
    const durationMs = this.eventDurationMs(speed, units)
    const seconds = (durationMs / 1000) * 0.95
    const hasVibrato = event.notes.some((n) => n.techniques.includes('vibrato'))
    if (this.vibrato) this.vibrato.depth.value = hasVibrato ? 0.45 : 0

    const sounding = event.notes.filter((n) => !n.muted)
    if (sounding.length < event.notes.length) this.muteSynth?.triggerAttackRelease(0.08)
    if (!sounding.length) return

    const held = sounding.filter((n) => !n.arrivedBy || n.arrivedBy === 'hammer-on' || n.arrivedBy === 'pull-off' || n.arrivedBy === 'tapping')
    const notes = held.length ? held : sounding
    const frequencies = notes.map((n) => fretToFrequency(n.string, n.fret, setup))
    const palmMuted = notes.some((n) => n.palmMute)
    synth.triggerAttackRelease(frequencies, palmMuted ? Math.min(seconds, 0.18) : seconds)

    const gliding = sounding.find(
      (n) => n.targetFret !== undefined && n.techniques.some((t) => ['slide-up', 'slide-down', 'bend', 'release'].includes(t)),
    )
    if (gliding?.targetFret !== undefined) {
      const target = fretToFrequency(gliding.string, gliding.targetFret, setup)
      // PolySynth não expõe frequency; um segundo toque curto indica o destino.
      setTimeout(() => synth.triggerAttackRelease([target], seconds * 0.5), durationMs * 0.5)
    }
  }

  private playClick(accent: boolean) {
    this.click?.triggerAttackRelease(accent ? 'C5' : 'G4', 0.08)
  }

  async playSequence(options: SequenceOptions): Promise<void> {
    await this.ensureAudio()
    this.stopTimer()
    const generation = ++this.generation
    const { events, order, speed, loop, setup, unitsOf, countIn, onCountIn, onEvent, onFinish } = options
    if (!order.length) {
      onFinish()
      return
    }

    let position = 0
    const step = async () => {
      if (generation !== this.generation) return
      if (position >= order.length) {
        if (loop) {
          position = 0
        } else {
          onFinish()
          return
        }
      }
      const eventId = order[position]
      const units = unitsOf(eventId)
      onEvent(eventId)
      await this.playEvent(events[eventId], speed, setup, Math.min(units, 2))
      position += 1
      this.timer = setTimeout(step, this.eventDurationMs(speed, units))
    }

    if (countIn) {
      const beatMs = this.eventDurationMs(speed)
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
    await step()
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
    this.synth?.releaseAll()
  }

  dispose(): void {
    this.pause()
    this.synth?.dispose()
    this.vibrato?.dispose()
    this.muteSynth?.dispose()
    this.click?.dispose()
    this.synth = null
    this.vibrato = null
    this.muteSynth = null
    this.click = null
  }
}
