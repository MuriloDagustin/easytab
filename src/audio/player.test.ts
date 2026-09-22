import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseTab } from '../domain/tab/parser'
import type { TabEvent } from '../domain/tab/types'

class FakeParam {
  value = 1
  calls: Array<[string, number, number]> = []
  setValueAtTime(v: number, t: number) { this.calls.push(['set', v, t]); return this }
  linearRampToValueAtTime(v: number, t: number) { this.calls.push(['ramp', v, t]); return this }
  cancelScheduledValues() { return this }
  getValueAtTime() { return this.value }
}

const created = { sources: [] as FakeSource[] }

class Node {
  volume = { value: 0 }
  connect() { return this }
  toDestination() { return this }
  chain() { return this }
  dispose() {}
  triggerAttackRelease() {}
  triggerAttack() {}
  triggerRelease() {}
}

class FakeSource extends Node {
  playbackRate = new FakeParam()
  started = 0
  stopped = 0
  buffer: string
  constructor(buffer: string) {
    super()
    this.buffer = buffer
    created.sources.push(this)
  }
  start() { this.started++; return this }
  stop() { this.stopped++; return this }
}

const NOTE_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

vi.mock('tone', () => ({
  start: async () => {},
  now: () => 0,
  Frequency: (v: string | number) => ({
    toMidi: () => {
      const m = /^([A-G])(#?)(-?\d)$/.exec(String(v))!
      return NOTE_PC[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) + 1) * 12
    },
    toFrequency: () => 440,
  }),
  ToneAudioBuffers: class {
    constructor(opts: { onload: () => void }) { queueMicrotask(opts.onload) }
    get(name: string) { return name }
    dispose() {}
  },
  ToneBufferSource: FakeSource,
  Filter: class extends Node {},
  Gain: class extends Node { gain = new FakeParam() },
  Vibrato: class extends Node { depth = { value: 0 } },
  NoiseSynth: Node,
  MembraneSynth: Node,
  MetalSynth: Node,
  Synth: class extends Node { frequency = new FakeParam() },
}))

const { TabPlayer } = await import('./player')

function events(line: string): TabEvent[] {
  const text = ['e', 'B', 'G', 'D', 'A', 'E'].map((l) => `${l}|${(l === 'B' ? line : '').padEnd(14, '-')}|`).join('\n')
  const r = parseTab(text)
  if (!r.ok) throw new Error(r.error)
  return r.tab.events
}

describe('TabPlayer com vozes por corda', () => {
  beforeEach(() => {
    created.sources = []
  })

  it('hammer-on muda a altura da mesma voz, sem novo ataque', async () => {
    const player = new TabPlayer()
    const [from, to] = events('--5h7--')
    await player.playEvent(from)
    await player.playEvent(to)
    expect(created.sources).toHaveLength(1)
    const rateCalls = created.sources[0].playbackRate.calls.filter(([kind]) => kind === 'set')
    expect(rateCalls.length).toBe(2)
    expect(rateCalls[1][1]).toBeGreaterThan(rateCalls[0][1])
  })

  it('bend faz rampa contínua até a casa de destino', async () => {
    const player = new TabPlayer()
    await player.playEvent(events('--7b9--')[0])
    const ramp = created.sources[0].playbackRate.calls.find(([kind]) => kind === 'ramp')
    expect(ramp).toBeDefined()
    expect(ramp![1]).toBeCloseTo(Math.pow(2, 2 / 12) * created.sources[0].playbackRate.calls[0][1], 5)
  })

  it('nota nova na mesma corda corta a anterior', async () => {
    const player = new TabPlayer()
    const [a, b] = events('--5--7--')
    await player.playEvent(a)
    await player.playEvent(b)
    expect(created.sources).toHaveLength(2)
    expect(created.sources[0].stopped).toBe(1)
    expect(created.sources[1].stopped).toBe(0)
  })

  it('pausar silencia todas as cordas', async () => {
    const player = new TabPlayer()
    await player.playEvent(events('--5--')[0])
    player.pause()
    expect(created.sources[0].stopped).toBe(1)
  })
})
