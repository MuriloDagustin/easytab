import { DEFAULT_SETUP, fretToNoteName, stringInfo, type Setup } from '../music/tuning'
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
  tapping: 'tapping',
}

export function stringLabel(string: Note['string'], setup: Setup = DEFAULT_SETUP): string {
  return `${ORDINALS[string - 1]} corda (${stringInfo(string, setup).ptName})`
}

function notePhrase(note: Note, setup: Setup): string {
  if (note.muted) return `${stringLabel(note.string, setup)} abafada`
  return note.fret === 0
    ? `${stringLabel(note.string, setup)} solta`
    : `${stringLabel(note.string, setup)} na casa ${note.fret}`
}

function joinPt(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}`
}

function arrivalSentence(note: Note, setup: Setup): string | null {
  switch (note.arrivedBy) {
    case 'hammer-on':
      return `Sem palhetar de novo, martele o dedo na casa ${note.fret} da ${stringLabel(note.string, setup)}.`
    case 'pull-off':
      return `Sem palhetar de novo, puxe o dedo para soar a ${notePhrase(note, setup)}.`
    case 'slide-up':
    case 'slide-down':
      return `Continue o slide até a casa ${note.fret}, sem levantar o dedo.`
    case 'bend':
      return `Esta é a altura que o bend precisa alcançar (casa ${note.fret}).`
    case 'release':
      return `Solte o bend até voltar para a casa ${note.fret}.`
    case 'tapping':
      return `Com a mão da palhetada, bata o dedo na casa ${note.fret} da ${stringLabel(note.string, setup)} (tapping).`
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
    case 'tapping':
      return `Em seguida, bata o dedo da mão direita na casa ${target ?? '?'} (tapping).`
  }
}

export interface EventDescription {
  /** Frase principal: o que tocar agora. */
  main: string
  /** Frases complementares sobre técnica. */
  details: string[]
  /** Notas soando, para exibir alturas. */
  pitches: string[]
  /** Cifra escrita acima da tab neste ponto, quando houver. */
  chord?: string
}

export function describeEvent(event: TabEvent, setup: Setup = DEFAULT_SETUP): EventDescription {
  const arrivals = event.notes.map((n) => arrivalSentence(n, setup)).filter((s): s is string => s !== null)
  const picked = event.notes.filter((n) => !n.arrivedBy)
  const allMuted = picked.length > 0 && picked.every((n) => n.muted)

  let main: string
  if (picked.length === 0) {
    main = arrivals[0] ?? 'Continue a nota anterior.'
  } else if (allMuted) {
    const strings = picked.map((n) => stringLabel(n.string, setup))
    main =
      picked.length === 1
        ? `Toque a ${strings[0]} abafada: encoste os dedos na corda sem apertar, só para dar o "tec".`
        : `Toque abafadas, sem deixar soar: ${joinPt(strings)}.`
  } else if (picked.length === 1) {
    main = `Toque a ${notePhrase(picked[0], setup)}.`
  } else {
    main = `Toque ao mesmo tempo: ${joinPt(picked.map((n) => notePhrase(n, setup)))}.`
  }

  const details: string[] = []
  if (picked.length > 0) details.push(...arrivals)
  else details.push(...arrivals.slice(1))
  for (const note of event.notes) {
    for (const technique of note.techniques) {
      details.push(techniqueSentence(note, technique))
    }
  }
  if (event.notes.some((n) => n.palmMute)) {
    details.push('Palm mute: apoie a lateral da mão da palhetada sobre as cordas, perto da ponte, para um som abafado.')
  }

  const pitches = event.notes
    .filter((n) => !n.muted)
    .map((n) => `${stringLabel(n.string, setup)}: ${fretToNoteName(n.string, n.fret, setup)}`)
  const description: EventDescription = { main, details, pitches }
  if (event.chord) description.chord = event.chord
  return description
}
