import { describe, expect, it } from 'vitest'
import { suggestFingers } from './suggest'
import { parseTab } from '../tab/parser'
import type { TabEvent } from '../tab/types'

function events(text: string): TabEvent[] {
  const r = parseTab(text)
  if (!r.ok) throw new Error(r.error)
  return r.tab.events
}

const wrap = (lines: Partial<Record<'e' | 'B' | 'G' | 'D' | 'A' | 'E', string>>, len = 20) =>
  (['e', 'B', 'G', 'D', 'A', 'E'] as const).map((l) => `${l}|${(lines[l] ?? '').padEnd(len, '-')}|`).join('\n')

describe('suggestFingers', () => {
  it('não sugere dedo para corda solta', () => {
    expect(suggestFingers(events(wrap({ G: '--0--' })), 0)).toBeNull()
  })

  it('sugere dedos dentro de uma posição de 4 casas', () => {
    const list = events(wrap({ B: '--5--6--7--8--' }))
    expect(suggestFingers(list, 0)?.get('2:5')).toBe(1)
    expect(suggestFingers(list, 3)?.get('2:8')).toBe(4)
  })

  it('não sugere quando o trecho passa de 4 casas', () => {
    expect(suggestFingers(events(wrap({ B: '--3--12--' })), 0)).toBeNull()
  })

  it('sugere dedos distintos em notas simultâneas', () => {
    const fingers = suggestFingers(events(wrap({ e: '--5--', B: '--7--' })), 0)
    expect(fingers?.get('1:5')).toBe(1)
    expect(fingers?.get('2:7')).toBe(3)
  })

  it('não sugere quando duas notas simultâneas cairiam no mesmo dedo', () => {
    expect(suggestFingers(events(wrap({ e: '--5--', B: '--5--' })), 0)).toBeNull()
  })
})

describe('suggestFingersSequence', () => {
  it('mantém a posição da mão enquanto as notas couberem nela', async () => {
    const { suggestFingersSequence } = await import('./suggest')
    const seq = suggestFingersSequence(events(wrap({ B: '--5--7--8--5--' })))
    expect(seq.map((m) => m?.get('2:5') ?? m?.get('2:7') ?? m?.get('2:8'))).toEqual([1, 3, 4, 1])
  })

  it('reancora quando a mão precisa mudar de posição', async () => {
    const { suggestFingersSequence } = await import('./suggest')
    const seq = suggestFingersSequence(events(wrap({ B: '--1--2--3--4--8--9--10--11--' }, 30)))
    expect(seq[0]?.get('2:1')).toBe(1)
    expect(seq[3]?.get('2:4')).toBe(4)
    expect(seq[4]?.get('2:8')).toBe(1)
    expect(seq[7]?.get('2:11')).toBe(4)
  })

  it('ignora cordas abafadas', async () => {
    const { suggestFingersSequence } = await import('./suggest')
    const seq = suggestFingersSequence(events(wrap({ A: '--x--' })))
    expect(seq[0]).toBeNull()
  })

  it('planeja trechos maiores que uma posição, trocando a mão onde precisa', async () => {
    const { suggestFingersSequence } = await import('./suggest')
    const seq = suggestFingersSequence(events(wrap({ B: '--5--7--8--10--8--7--5--' }, 30)))
    expect(seq[0]?.get('2:5')).toBe(1)
    expect(seq[2]?.get('2:8')).toBe(4)
    expect(seq[3]?.get('2:10')).toBe(4)
    expect(seq[5]?.get('2:7')).toBe(1)
  })
})
