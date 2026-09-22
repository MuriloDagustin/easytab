import type { ParsedTab } from './types'

interface Section {
  blocks: number[]
  repeat: number
}

/** Seções: começam num bloco com título de seção e vão até o próximo. */
export function sectionsOf(tab: ParsedTab): Section[] {
  const sections: Section[] = []
  for (const block of tab.blocks) {
    if (!sections.length || block.sectionStart) sections.push({ blocks: [], repeat: block.sectionRepeat ?? 1 })
    sections.at(-1)!.blocks.push(block.index)
  }
  return sections
}

/**
 * Ordem de reprodução com as repetições indicadas na tab ("2X", "x2"), só com os
 * eventos permitidos por `include` (filtro de corda).
 */
export function playbackOrder(tab: ParsedTab, include: (id: number) => boolean, expandRepeats: boolean): number[] {
  const byBlock = new Map<number, number[]>()
  for (const e of tab.events) {
    if (!include(e.id)) continue
    byBlock.set(e.blockIndex, [...(byBlock.get(e.blockIndex) ?? []), e.id])
  }
  const order: number[] = []
  for (const section of sectionsOf(tab)) {
    const times = expandRepeats ? section.repeat : 1
    for (let t = 0; t < times; t++) {
      for (const blockIndex of section.blocks) {
        const blockTimes = expandRepeats ? (tab.blocks[blockIndex].repeat ?? 1) : 1
        for (let b = 0; b < blockTimes; b++) order.push(...(byBlock.get(blockIndex) ?? []))
      }
    }
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
