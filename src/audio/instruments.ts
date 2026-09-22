export type Timbre = 'acoustic' | 'electric' | 'nylon' | 'synth'

export interface Instrument {
  id: Timbre
  name: string
  /** Notas com amostra própria; o Sampler transpõe as demais a partir da mais próxima. */
  notes: string[]
}

export const INSTRUMENTS: Instrument[] = [
  {
    id: 'acoustic',
    name: 'Violão de aço',
    notes: ['E2', 'G2', 'A#2', 'C#3', 'E3', 'G3', 'A#3', 'C#4', 'E4', 'G4', 'A#4', 'C#5'],
  },
  {
    id: 'electric',
    name: 'Guitarra elétrica',
    notes: ['E2', 'F#2', 'A2', 'C3', 'D#3', 'F#3', 'A3', 'C4', 'D#4', 'F#4', 'A4', 'C5', 'D#5', 'F#5', 'A5', 'C6'],
  },
  {
    id: 'nylon',
    name: 'Violão de nylon',
    notes: [
      'E2', 'F#2', 'G#2', 'A2', 'B2', 'C#3', 'D3', 'E3', 'F#3', 'A3', 'B3', 'C#4',
      'D#4', 'E4', 'F#4', 'G#4', 'A4', 'B4', 'C#5', 'D5', 'E5', 'F#5', 'G5', 'A5',
    ],
  },
  { id: 'synth', name: 'Sintetizador simples', notes: [] },
]

export const DEFAULT_TIMBRE: Timbre = 'acoustic'

export function getInstrument(id: string): Instrument {
  return INSTRUMENTS.find((i) => i.id === id) ?? INSTRUMENTS[0]
}

/** Nome do arquivo: sustenido vira "s" (C#3 -> Cs3.mp3). */
export function sampleFile(note: string): string {
  return `${note.replace('#', 's')}.mp3`
}

export function sampleUrls(instrument: Instrument): Record<string, string> {
  return Object.fromEntries(instrument.notes.map((n) => [n, sampleFile(n)]))
}

export function samplesBaseUrl(instrument: Instrument, base = import.meta.env.BASE_URL): string {
  return `${base.endsWith('/') ? base : `${base}/`}samples/${instrument.id}/`
}
