export type StringNumber = 1 | 2 | 3 | 4 | 5 | 6

export type Technique =
  | 'vibrato'
  | 'slide-up'
  | 'slide-down'
  | 'hammer-on'
  | 'pull-off'
  | 'bend'
  | 'release'

export interface Note {
  string: StringNumber
  fret: number
  /** Técnicas que partem desta nota (ex.: hammer-on para `targetFret`). */
  techniques: Technique[]
  /** Casa de destino quando a técnica liga duas notas (h, p, /, \, b, r). */
  targetFret?: number
  /** Técnica pela qual esta nota é alcançada a partir da anterior na mesma corda. */
  arrivedBy?: Technique
}

export interface TabEvent {
  id: number
  blockIndex: number
  /** Coluna dentro do corpo do bloco (após rótulo e primeira barra). */
  column: number
  /** Quantidade de caracteres ocupados pela nota mais larga do evento. */
  width: number
  notes: Note[]
}

export interface TabBlock {
  index: number
  /** Linhas originais, já ordenadas da corda 1 (aguda) até a 6 (grave). */
  lines: string[]
  /** Índice, em cada linha original, onde o corpo da tablatura começa. */
  bodyOffsets: number[]
  bodyLength: number
}

export interface ParsedTab {
  events: TabEvent[]
  blocks: TabBlock[]
  warnings: string[]
}

export type ParseResult =
  | { ok: true; tab: ParsedTab }
  | { ok: false; error: string }

export const STRING_ORDER_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'] as const
