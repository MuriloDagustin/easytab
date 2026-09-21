import { frequencyToMidi } from '../domain/music/tuning'

export interface PitchReading {
  frequency: number
  midi: number
  /** Desvio em cents em relação à nota MIDI mais próxima. */
  cents: number
  clarity: number
}

export class MicError extends Error {}

const MIN_FREQ = 70
const MAX_FREQ = 1400

/**
 * Autocorrelação normalizada (McLeod simplificado). Suficiente para uma corda de
 * guitarra por vez; acordes devolvem a fundamental mais forte.
 */
export function detectPitch(buffer: Float32Array, sampleRate: number): PitchReading | null {
  const size = buffer.length
  let rms = 0
  for (let i = 0; i < size; i++) rms += buffer[i] * buffer[i]
  rms = Math.sqrt(rms / size)
  if (rms < 0.01) return null

  const minLag = Math.floor(sampleRate / MAX_FREQ)
  const maxLag = Math.min(Math.floor(sampleRate / MIN_FREQ), size - 1)
  const nsdf = new Float32Array(maxLag + 1)
  for (let lag = minLag; lag <= maxLag; lag++) {
    let acf = 0
    let m = 0
    for (let i = 0; i < size - lag; i++) {
      acf += buffer[i] * buffer[i + lag]
      m += buffer[i] * buffer[i] + buffer[i + lag] * buffer[i + lag]
    }
    nsdf[lag] = m > 0 ? (2 * acf) / m : 0
  }

  let bestLag = -1
  let bestValue = 0
  let lag = minLag
  while (lag <= maxLag && nsdf[lag] > 0) lag++
  for (; lag <= maxLag; lag++) {
    if (nsdf[lag] > 0 && nsdf[lag] > nsdf[lag - 1] && nsdf[lag] >= (nsdf[lag + 1] ?? -1)) {
      if (nsdf[lag] > bestValue) {
        bestValue = nsdf[lag]
        bestLag = lag
      }
      if (bestValue > 0.9) break
    }
  }
  if (bestLag === -1 || bestValue < 0.6) return null

  // Interpolação parabólica para refinar o pico.
  const prev = nsdf[bestLag - 1] ?? nsdf[bestLag]
  const next = nsdf[bestLag + 1] ?? nsdf[bestLag]
  const denominator = 2 * (2 * nsdf[bestLag] - prev - next)
  const shift = denominator !== 0 ? (next - prev) / denominator : 0
  const frequency = sampleRate / (bestLag + shift)
  if (frequency < MIN_FREQ || frequency > MAX_FREQ) return null

  const midiFloat = frequencyToMidi(frequency)
  const midi = Math.round(midiFloat)
  return { frequency, midi, cents: Math.round((midiFloat - midi) * 100), clarity: bestValue }
}

export class MicListener {
  private context: AudioContext | null = null
  private stream: MediaStream | null = null
  private analyser: AnalyserNode | null = null
  private buffer: Float32Array<ArrayBuffer> | null = null
  private frame = 0

  async start(onReading: (reading: PitchReading | null) => void): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new MicError('Este navegador não permite usar o microfone.')
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
      })
    } catch {
      throw new MicError('Não consegui acessar o microfone. Verifique a permissão do navegador e tente de novo.')
    }
    this.context = new AudioContext()
    const source = this.context.createMediaStreamSource(this.stream)
    this.analyser = this.context.createAnalyser()
    this.analyser.fftSize = 2048
    source.connect(this.analyser)
    this.buffer = new Float32Array(this.analyser.fftSize)

    const tick = () => {
      if (!this.analyser || !this.buffer || !this.context) return
      this.analyser.getFloatTimeDomainData(this.buffer)
      onReading(detectPitch(this.buffer, this.context.sampleRate))
      this.frame = requestAnimationFrame(tick)
    }
    this.frame = requestAnimationFrame(tick)
  }

  stop(): void {
    cancelAnimationFrame(this.frame)
    this.stream?.getTracks().forEach((t) => t.stop())
    void this.context?.close()
    this.stream = null
    this.context = null
    this.analyser = null
    this.buffer = null
  }
}
