import { describe, expect, it } from 'vitest'
import { detectPitch } from './pitch'

function sine(frequency: number, sampleRate = 44100, size = 2048, harmonics = [1]): Float32Array {
  const buffer = new Float32Array(size)
  for (let i = 0; i < size; i++) {
    let v = 0
    harmonics.forEach((h, k) => {
      v += Math.sin((2 * Math.PI * frequency * h * i) / sampleRate) / (k + 1)
    })
    buffer[i] = v * 0.5
  }
  return buffer
}

describe('detectPitch', () => {
  it('detecta A2 (110 Hz)', () => {
    const reading = detectPitch(sine(110), 44100)
    expect(reading?.midi).toBe(45)
    expect(Math.abs(reading!.cents)).toBeLessThan(10)
  })

  it('detecta E4 (329,63 Hz) com harmônicos', () => {
    const reading = detectPitch(sine(329.63, 44100, 2048, [1, 2, 3]), 44100)
    expect(reading?.midi).toBe(64)
  })

  it('devolve null para silêncio', () => {
    expect(detectPitch(new Float32Array(2048), 44100)).toBeNull()
  })
})
