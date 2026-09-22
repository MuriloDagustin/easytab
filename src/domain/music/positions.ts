import type { StringNumber } from '../tab/types'
import { fretToMidi, type Setup } from './tuning'

export interface Position {
  string: StringNumber
  fret: number
}

/** Onde mais a mesma altura existe no braço, até a casa `maxFret`. */
export function alternatePositions(string: StringNumber, fret: number, setup: Setup, maxFret = 15): Position[] {
  const midi = fretToMidi(string, fret, setup)
  const result: Position[] = []
  for (let s = 1 as StringNumber; s <= 6; s = (s + 1) as StringNumber) {
    if (s === string) continue
    const f = midi - fretToMidi(s, 0, setup)
    if (f >= 0 && f <= maxFret) result.push({ string: s, fret: f })
  }
  return result
}
