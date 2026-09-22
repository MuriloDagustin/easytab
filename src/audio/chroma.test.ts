import { describe, expect, it } from 'vitest'
import { chordPresent, chromaFromSpectrum } from './chroma'

const SR = 48000
const FFT = 8192

function spectrum(freqs: number[]): Float32Array {
  const db = new Float32Array(FFT / 2).fill(-120)
  for (const f of freqs) {
    for (const h of [1, 2, 3]) {
      const bin = Math.round((f * h * FFT) / SR)
      if (bin < db.length) db[bin] = -20 - h * 6
    }
  }
  return db
}

describe('detecção de acordes pelo microfone', () => {
  it('reconhece as três notas de um Dó maior', () => {
    const chroma = chromaFromSpectrum(spectrum([130.81, 164.81, 196]), SR, FFT)
    expect(chordPresent(chroma, [0, 4, 7])).toBe(true)
  })

  it('não aceita quando falta uma das notas', () => {
    const chroma = chromaFromSpectrum(spectrum([130.81, 196]), SR, FFT)
    expect(chordPresent(chroma, [0, 4, 7])).toBe(false)
  })

  it('não aceita um acorde diferente', () => {
    const chroma = chromaFromSpectrum(spectrum([146.83, 185, 220]), SR, FFT)
    expect(chordPresent(chroma, [0, 4, 7])).toBe(false)
  })

  it('silêncio não conta', () => {
    expect(chordPresent(chromaFromSpectrum(new Float32Array(FFT / 2).fill(-140), SR, FFT), [0, 4, 7])).toBe(false)
  })
})
