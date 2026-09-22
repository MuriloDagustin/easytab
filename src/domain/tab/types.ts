import type { Jump } from './jumps'

export type StringNumber = 1 | 2 | 3 | 4 | 5 | 6

export type Technique =
  | 'vibrato'
  | 'slide-up'
  | 'slide-down'
  | 'hammer-on'
  | 'pull-off'
  | 'bend'
  | 'release'
  | 'tapping'

export interface Note {
  string: StringNumber
  fret: number
  /** Técnicas que partem desta nota (ex.: hammer-on para `targetFret`). */
  techniques: Technique[]
  /** Casa de destino quando a técnica liga duas notas (h, p, /, \, b, r). */
  targetFret?: number
  /** Técnica pela qual esta nota é alcançada a partir da anterior na mesma corda. */
  arrivedBy?: Technique
  /** Corda abafada (`x`): toca-se sem deixar a nota soar. */
  muted?: boolean
  /** Palm mute indicado por uma linha "PM" junto ao bloco. */
  palmMute?: boolean
}

export interface TabEvent {
  id: number
  blockIndex: number
  /** Coluna dentro do corpo do bloco (após rótulo e primeira barra). */
  column: number
  /** Quantidade de caracteres ocupados pela nota mais larga do evento. */
  width: number
  notes: Note[]
  /** Cifra escrita acima da tab nesta coluna, quando houver. */
  chord?: string
}

export interface TabBlock {
  index: number
  /** Linhas originais, já ordenadas da corda 1 (aguda) até a 6 (grave). */
  lines: string[]
  /** Índice, em cada linha original, onde o corpo da tablatura começa. */
  bodyOffsets: number[]
  bodyLength: number
  /** Linha de cifras acima do bloco, alinhada ao corpo, quando houver. */
  chordLine?: string
  /** Texto livre acima do bloco: título de seção, observação do autor. */
  heading?: string
  /** O bloco abre uma seção nova (título como "[Solo 1]" ou "Parte 2 de 6"). */
  sectionStart?: boolean
  /** Quantas vezes a seção iniciada por este bloco se repete ("2X", "2 vezes"). */
  sectionRepeat?: number
  /** Quantas vezes só este bloco se repete ("x2" no fim da linha). */
  repeat?: number
  /** Instruções antes do bloco, como "repete o refrão". */
  jumpsBefore?: Jump[]
}

export interface ParsedTab {
  events: TabEvent[]
  blocks: TabBlock[]
  warnings: string[]
  /** Instruções depois do último bloco, como "volta ao início". */
  jumpsAtEnd?: Jump[]
}

export type ParseResult =
  | { ok: true; tab: ParsedTab }
  | { ok: false; error: string }

export const STRING_ORDER_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'] as const
