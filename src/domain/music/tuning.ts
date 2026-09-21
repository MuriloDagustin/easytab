import type { StringNumber } from '../tab/types'

export interface Tuning {
  id: string
  name: string
  /** MIDI da corda solta, da corda 1 (aguda) até a 6 (grave). */
  midi: Record<StringNumber, number>
}

export const TUNINGS: Tuning[] = [
  { id: 'standard', name: 'Padrão (E A D G B e)', midi: { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 } },
  { id: 'drop-d', name: 'Drop D (D A D G B e)', midi: { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 38 } },
  { id: 'half-down', name: 'Meio tom abaixo (Eb Ab Db Gb Bb eb)', midi: { 1: 63, 2: 58, 3: 54, 4: 49, 5: 44, 6: 39 } },
  { id: 'full-down', name: 'Um tom abaixo (D G C F A d)', midi: { 1: 62, 2: 57, 3: 53, 4: 48, 5: 43, 6: 38 } },
  { id: 'drop-c', name: 'Drop C (C G C F A d)', midi: { 1: 62, 2: 57, 3: 53, 4: 48, 5: 43, 6: 36 } },
  { id: 'dadgad', name: 'DADGAD', midi: { 1: 62, 2: 57, 3: 55, 4: 50, 5: 45, 6: 38 } },
  { id: 'open-g', name: 'Sol aberto (D G D G B d)', midi: { 1: 62, 2: 59, 3: 55, 4: 50, 5: 43, 6: 38 } },
]

export const STANDARD_TUNING = TUNINGS[0]
export const MAX_CAPO = 9

export function getTuning(id: string): Tuning {
  return TUNINGS.find((t) => t.id === id) ?? STANDARD_TUNING
}

/** Compatibilidade com o código que só precisa da afinação padrão. */
export const STANDARD_TUNING_MIDI = STANDARD_TUNING.midi

const STRING_PT_NAMES: Record<string, string> = {
  C: 'Dó',
  'C#': 'Dó#',
  D: 'Ré',
  'D#': 'Ré#',
  E: 'Mi',
  F: 'Fá',
  'F#': 'Fá#',
  G: 'Sol',
  'G#': 'Sol#',
  A: 'Lá',
  'A#': 'Lá#',
  B: 'Si',
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export interface Setup {
  tuning: Tuning
  capo: number
}

export const DEFAULT_SETUP: Setup = { tuning: STANDARD_TUNING, capo: 0 }

export function openStringMidi(string: StringNumber, setup: Setup = DEFAULT_SETUP): number {
  return setup.tuning.midi[string] + setup.capo
}

export function fretToMidi(string: StringNumber, fret: number, setup: Setup = DEFAULT_SETUP): number {
  return openStringMidi(string, setup) + fret
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function frequencyToMidi(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440)
}

export function fretToFrequency(string: StringNumber, fret: number, setup: Setup = DEFAULT_SETUP): number {
  return midiToFrequency(fretToMidi(string, fret, setup))
}

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  return `${NOTE_NAMES[midi % 12]}${octave}`
}

export function fretToNoteName(string: StringNumber, fret: number, setup: Setup = DEFAULT_SETUP): string {
  return midiToNoteName(fretToMidi(string, fret, setup))
}

/** Rótulo curto da corda solta (ex.: "e", "B") e nome em português, considerando afinação e capo. */
export function stringInfo(string: StringNumber, setup: Setup = DEFAULT_SETUP): { letter: string; ptName: string } {
  const midi = openStringMidi(string, setup)
  const pitch = NOTE_NAMES[midi % 12]
  const letter = string === 1 && setup.tuning.id === 'standard' && setup.capo === 0 ? 'e' : string === 1 ? pitch.toLowerCase() : pitch
  let ptName = STRING_PT_NAMES[pitch]
  if (string === 1 && pitch === 'E') ptName = 'Mi agudo'
  if (string === 6 && pitch === 'E') ptName = 'Mi grave'
  return { letter, ptName }
}

export const STRING_NAMES: Record<StringNumber, { letter: string; ptName: string }> = {
  1: stringInfo(1),
  2: stringInfo(2),
  3: stringInfo(3),
  4: stringInfo(4),
  5: stringInfo(5),
  6: stringInfo(6),
}
