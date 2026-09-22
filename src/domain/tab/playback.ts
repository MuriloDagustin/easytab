import { sectionMatches, type Jump } from './jumps'
import type { ParsedTab } from './types'

interface Section {
  blocks: number[]
  repeat: number
  heading?: string
}

/** Seções: começam num bloco com título de seção e vão até o próximo. */
export function sectionsOf(tab: ParsedTab): Section[] {
  const sections: Section[] = []
  for (const block of tab.blocks) {
    if (!sections.length || block.sectionStart) {
      sections.push({ blocks: [], repeat: block.sectionRepeat ?? 1, ...(block.heading ? { heading: block.heading } : {}) })
    }
    sections.at(-1)!.blocks.push(block.index)
  }
  return sections
}

/**
 * Ordem de reprodução com as repetições indicadas na tab ("2X", "x2") e as instruções
 * de salto ("repete o refrão", "volta ao início"), só com os eventos permitidos por
 * `include` (filtro de corda).
 */
export function playbackOrder(tab: ParsedTab, include: (id: number) => boolean, expandRepeats: boolean): number[] {
  const byBlock = new Map<number, number[]>()
  for (const e of tab.events) {
    if (!include(e.id)) continue
    byBlock.set(e.blockIndex, [...(byBlock.get(e.blockIndex) ?? []), e.id])
  }
  const sections = sectionsOf(tab)
  const blockEvents = (blockIndex: number) => {
    const times = expandRepeats ? (tab.blocks[blockIndex].repeat ?? 1) : 1
    return Array.from({ length: times }, () => byBlock.get(blockIndex) ?? []).flat()
  }
  const sectionEvents = (index: number) => {
    const section = sections[index]
    const times = expandRepeats ? section.repeat : 1
    return Array.from({ length: times }, () => section.blocks.flatMap(blockEvents)).flat()
  }
  const resolve = (jump: Jump, before: number): number[] => {
    let ids: number[] = []
    if (jump.target === 'start') {
      ids = sections.slice(0, before).flatMap((_, i) => sectionEvents(i))
    } else {
      // O autor às vezes escreve "repete o refrão" e cola a tab do refrão logo abaixo.
      if (sectionMatches(sections[before]?.heading, jump.target)) return []
      const found = sections.findIndex((s, i) => i < before && sectionMatches(s.heading, jump.target))
      if (found >= 0) ids = sectionEvents(found)
    }
    return Array.from({ length: jump.times }, () => ids).flat()
  }

  const order: number[] = []
  sections.forEach((section, si) => {
    const times = expandRepeats ? section.repeat : 1
    for (let t = 0; t < times; t++) {
      section.blocks.forEach((blockIndex, bi) => {
        const jumps = tab.blocks[blockIndex].jumpsBefore
        if (expandRepeats && t === 0 && jumps) {
          // No meio de uma seção, a própria seção já conta como tocada antes.
          const before = bi === 0 ? si : si + 1
          for (const jump of jumps) order.push(...resolve(jump, before))
        }
        order.push(...blockEvents(blockIndex))
      })
    }
  })
  if (expandRepeats && tab.jumpsAtEnd) {
    for (const jump of tab.jumpsAtEnd) order.push(...resolve(jump, sections.length))
  }
  return order
}

/** A partir de onde o aluno está: a primeira ocorrência do evento atual na ordem expandida. */
export function orderFrom(order: number[], currentId: number): number[] {
  const at = order.indexOf(currentId)
  if (at >= 0) return order.slice(at)
  const next = order.findIndex((id) => id > currentId)
  return next >= 0 ? order.slice(next) : order
}
