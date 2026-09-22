const MIN_FREQ = 70
const MAX_FREQ = 2000

/**
 * Energia de cada classe de altura (C a B) no espectro, normalizada pelo maior valor.
 * `magnitudesDb` vem de AnalyserNode.getFloatFrequencyData.
 */
export function chromaFromSpectrum(magnitudesDb: Float32Array, sampleRate: number, fftSize: number): number[] {
  const chroma = new Array(12).fill(0)
  const binHz = sampleRate / fftSize
  for (let bin = 1; bin < magnitudesDb.length; bin++) {
    const freq = bin * binHz
    if (freq < MIN_FREQ || freq > MAX_FREQ) continue
    const amplitude = Math.pow(10, magnitudesDb[bin] / 20)
    const pc = ((Math.round(69 + 12 * Math.log2(freq / 440)) % 12) + 12) % 12
    chroma[pc] += amplitude * amplitude
  }
  const max = Math.max(...chroma)
  return max > 0 ? chroma.map((v) => v / max) : chroma
}

/**
 * Todas as notas esperadas estão soando? Cada uma precisa de uma fatia relevante da
 * energia, e juntas precisam dominar o espectro, para ruído não contar como acerto.
 */
export function chordPresent(chroma: number[], expected: number[], minEach = 0.25, minShare = 0.55): boolean {
  const pcs = [...new Set(expected.map((p) => ((p % 12) + 12) % 12))]
  if (!pcs.length) return false
  const total = chroma.reduce((s, v) => s + v, 0)
  if (!total) return false
  const share = pcs.reduce((s, p) => s + chroma[p], 0) / total
  return pcs.every((p) => chroma[p] >= minEach) && share >= minShare
}
