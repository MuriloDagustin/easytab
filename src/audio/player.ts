import type * as ToneType from 'tone'
import { fretToFrequency } from '../domain/music/tuning'
import type { TabEvent } from '../domain/tab/types'

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5] as const
export type Speed = (typeof SPEEDS)[number]

const BASE_EVENT_MS = 620

export interface SequenceOptions {
  events: TabEvent[]
  startIndex: number
  endIndex: number
  speed: number
  loop: boolean
  onEvent: (index: number) => void
  onFinish: () => void
}

/**
 * Reprodução simples: cada evento dura o mesmo tempo, porque tablatura em texto
 * não carrega ritmo confiável.
 */
export class TabPlayer {
  private synth: ToneType.PolySynth<ToneType.Synth> | null = null
  private vibrato: ToneType.Vibrato | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private started = false

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
    }
    return this.synth
  }

  eventDurationMs(speed: number): number {
    return BASE_EVENT_MS / speed
  }

  async playEvent(event: TabEvent, speed = 1): Promise<void> {
    const synth = await this.ensureAudio()
    const durationMs = this.eventDurationMs(speed)
    const hasVibrato = event.notes.some((n) => n.techniques.includes('vibrato'))
    if (this.vibrato) this.vibrato.depth.value = hasVibrato ? 0.45 : 0

    const held = event.notes.filter((n) => !n.arrivedBy || n.arrivedBy === 'hammer-on' || n.arrivedBy === 'pull-off')
    const notes = held.length ? held : event.notes
    const frequencies = notes.map((n) => fretToFrequency(n.string, n.fret))
    const seconds = (durationMs / 1000) * 0.95
    synth.triggerAttackRelease(frequencies, seconds)

    const gliding = event.notes.find(
      (n) => n.targetFret !== undefined && n.techniques.some((t) => t !== 'vibrato'),
    )
    if (gliding?.targetFret !== undefined) {
      const isSlideOrBend = gliding.techniques.some((t) =>
        ['slide-up', 'slide-down', 'bend', 'release'].includes(t),
      )
      if (isSlideOrBend) {
        const target = fretToFrequency(gliding.string, gliding.targetFret)
        // PolySynth não expõe frequency; um segundo toque curto indica o destino.
        setTimeout(() => {
          synth.triggerAttackRelease([target], seconds * 0.5)
        }, durationMs * 0.5)
      }
    }
  }

  async playSequence(options: SequenceOptions): Promise<void> {
    await this.ensureAudio()
    this.stopTimer()
    const { events, startIndex, endIndex, speed, loop, onEvent, onFinish } = options
    let index = startIndex

    const step = async () => {
      if (index > endIndex || index >= events.length) {
        if (loop) {
          index = startIndex
        } else {
          onFinish()
          return
        }
      }
      const current = index
      onEvent(current)
      await this.playEvent(events[current], speed)
      index = current + 1
      this.timer = setTimeout(step, this.eventDurationMs(speed))
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
    this.stopTimer()
    this.synth?.releaseAll()
  }

  dispose(): void {
    this.stopTimer()
    this.synth?.dispose()
    this.vibrato?.dispose()
    this.synth = null
    this.vibrato = null
  }
}
