import type { StringNumber } from '../tab/types'
import { frequencyToMidi, midiToNoteName, openStringMidi, stringInfo, type Setup } from './tuning'

export interface TunerReading {
  note: string
  /** Desvio em cents para a nota cromática mais próxima. */
  cents: number
  string: StringNumber
  stringLabel: string
  /** Desvio em cents para a corda solta mais próxima; negativo = abaixo. */
  stringCents: number
  inTune: boolean
}

const IN_TUNE_CENTS = 5

export function readTuner(frequency: number, setup: Setup): TunerReading {
  const midi = frequencyToMidi(frequency)
  const nearest = Math.round(midi)
  let best: StringNumber = 1
  for (let s = 1 as StringNumber; s <= 6; s = (s + 1) as StringNumber) {
    if (Math.abs(midi - openStringMidi(s, setup)) < Math.abs(midi - openStringMidi(best, setup))) best = s
  }
  const stringCents = Math.round((midi - openStringMidi(best, setup)) * 100)
  return {
    note: midiToNoteName(nearest),
    cents: Math.round((midi - nearest) * 100),
    string: best,
    stringLabel: `${best}ª corda (${stringInfo(best, setup).ptName})`,
    stringCents,
    inTune: Math.abs(stringCents) <= IN_TUNE_CENTS,
  }
}

/** Mediana das últimas leituras, para o ponteiro não tremer. */
export function smoothFrequency(history: number[]): number {
  const sorted = [...history].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}
