import { STRING_NAMES, fretToNoteName } from '../music/tuning'
import type { Note, TabEvent, Technique } from '../tab/types'

const ORDINALS = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª']

export const TECHNIQUE_LABELS: Record<Technique, string> = {
  vibrato: 'vibrato',
  'slide-up': 'slide ascendente',
  'slide-down': 'slide descendente',
  'hammer-on': 'hammer-on',
  'pull-off': 'pull-off',
  bend: 'bend',
  release: 'release',
}

export function stringLabel(string: Note['string']): string {
  return `${ORDINALS[string - 1]} corda (${STRING_NAMES[string].ptName})`
}

function notePhrase(note: Note): string {
  return note.fret === 0 ? `${stringLabel(note.string)} solta` : `${stringLabel(note.string)} na casa ${note.fret}`
}

function joinPt(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}`
}

function arrivalSentence(note: Note): string | null {
  switch (note.arrivedBy) {
    case 'hammer-on':
      return `Sem palhetar de novo, martele o dedo na casa ${note.fret} da ${stringLabel(note.string)}.`
    case 'pull-off':
      return `Sem palhetar de novo, puxe o dedo para soar a ${notePhrase(note)}.`
    case 'slide-up':
    case 'slide-down':
      return `Continue o slide até a casa ${note.fret}, sem levantar o dedo.`
    case 'bend':
      return `Esta é a altura que o bend precisa alcançar (casa ${note.fret}).`
    case 'release':
      return `Solte o bend até voltar para a casa ${note.fret}.`
    default:
      return null
  }
}

function techniqueSentence(note: Note, technique: Technique): string {
  const target = note.targetFret
  switch (technique) {
    case 'vibrato':
      return 'Mantenha a nota soando e balance o dedo para fazer vibrato.'
    case 'hammer-on':
      return `Martele o dedo na casa ${target ?? '?'} sem palhetar de novo (hammer-on).`
    case 'pull-off':
      return `Puxe o dedo para soar a casa ${target ?? '?'} sem palhetar de novo (pull-off).`
    case 'slide-up':
      return `Deslize o dedo até a casa ${target ?? '?'}, sem tirar a pressão da corda.`
    case 'slide-down':
      return `Deslize o dedo para trás até a casa ${target ?? '?'}, sem tirar a pressão da corda.`
    case 'bend':
      return `Empurre a corda para o lado até a nota subir como se fosse a casa ${target ?? '?'} (bend).`
    case 'release':
      return `Solte o bend devagar até a nota voltar para a casa ${target ?? '?'}.`
  }
}

export interface EventDescription {
  /** Frase principal: o que tocar agora. */
  main: string
  /** Frases complementares sobre técnica. */
  details: string[]
  /** Notas soando, para exibir alturas. */
  pitches: string[]
}

export function describeEvent(event: TabEvent): EventDescription {
  const arrivals = event.notes.map(arrivalSentence).filter((s): s is string => s !== null)
  const picked = event.notes.filter((n) => !n.arrivedBy)

  let main: string
  if (picked.length === 0) {
    main = arrivals[0] ?? 'Continue a nota anterior.'
  } else if (picked.length === 1) {
    const note = picked[0]
    main = note.fret === 0 ? `Toque a ${notePhrase(note)}.` : `Toque a ${notePhrase(note)}.`
  } else {
    main = `Toque ao mesmo tempo: ${joinPt(picked.map(notePhrase))}.`
  }

  const details: string[] = []
  if (picked.length > 0) details.push(...arrivals)
  else details.push(...arrivals.slice(1))
  for (const note of event.notes) {
    for (const technique of note.techniques) {
      details.push(techniqueSentence(note, technique))
    }
  }

  const pitches = event.notes.map((n) => `${stringLabel(n.string)}: ${fretToNoteName(n.string, n.fret)}`)
  return { main, details, pitches }
}
