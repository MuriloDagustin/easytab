export interface Jump {
  /** 'start' = volta ao início; senão, nome normalizado da seção a tocar. */
  target: string
  /** Como apareceu no texto, para mostrar ao aluno. */
  label: string
  times: number
}

const SECTION_NAMES =
  'refr[ãa]o|pr[ée]-?refr[ãa]o|intro(?:du[çc][ãa]o)?|riff(?:\\s*\\d+)?|solo(?:\\s*\\d+)?|verso(?:\\s*\\d+)?|ponte|base|final|primeira parte|segunda parte|terceira parte'
const VERB = '(?:repet\\w*|volta\\w*|toca\\w*|faz\\w*|fazer)'
const LINK = '(?:\\s+(?:de novo|novamente))?(?:\\s+(?:ao|à|a|o|para o|para a|pro|pra|pra o))?(?:\\s+(?:o|a))?'
const NAMED = new RegExp(`${VERB}${LINK}\\s+(${SECTION_NAMES})\\b`, 'i')
const TO_START = /\b(?:d\.?\s?c\.?(?=\s|$)|da capo|volt\w*\s+(?:ao|pro|para o|pra o)\s+(?:in[ií]cio|come[çc]o))/i
const TIMES = /(\d{1,2})\s*(?:[xX×]|vezes)\b/i

export function normalizeName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[[\]()*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Instruções como "repete o refrão", "volta pro início" ou "D.C." nas linhas de texto. */
export function detectJumps(lines: string[]): Jump[] {
  const jumps: Jump[] = []
  for (const line of lines) {
    const times = Number(TIMES.exec(line)?.[1] ?? 1)
    const count = times >= 1 && times <= 8 ? times : 1
    if (TO_START.test(line)) {
      jumps.push({ target: 'start', label: 'o início', times: count })
      continue
    }
    const m = NAMED.exec(line)
    if (m) jumps.push({ target: normalizeName(m[1]), label: m[1].trim(), times: count })
  }
  return jumps
}

/** O título de uma seção corresponde ao nome pedido ("refrão" casa com "[Primeiro Refrão]", não com "Pré-refrão"). */
export function sectionMatches(heading: string | undefined, target: string): boolean {
  if (!heading) return false
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z-])${escaped}($|[^a-z])`).test(normalizeName(heading))
}
