import type { StringNumber } from '../tab/types'

/** Afinação padrão, da corda 1 (E4, aguda) até a 6 (E2, grave), em MIDI. */
export const STANDARD_TUNING_MIDI: Record<StringNumber, number> = {
  1: 64,
  2: 59,
  3: 55,
  4: 50,
  5: 45,
  6: 40,
}

export const STRING_NAMES: Record<StringNumber, { letter: string; ptName: string }> = {
  1: { letter: 'e', ptName: 'Mi agudo' },
  2: { letter: 'B', ptName: 'Si' },
  3: { letter: 'G', ptName: 'Sol' },
  4: { letter: 'D', ptName: 'Ré' },
  5: { letter: 'A', ptName: 'Lá' },
  6: { letter: 'E', ptName: 'Mi grave' },
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function fretToMidi(string: StringNumber, fret: number): number {
  return STANDARD_TUNING_MIDI[string] + fret
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function fretToFrequency(string: StringNumber, fret: number): number {
  return midiToFrequency(fretToMidi(string, fret))
}

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  return `${NOTE_NAMES[midi % 12]}${octave}`
}

export function fretToNoteName(string: StringNumber, fret: number): string {
  return midiToNoteName(fretToMidi(string, fret))
}
