import { describe, expect, it } from 'vitest'
import { reviewRange, suggestReview } from './review'
import { parseTab } from './tab/parser'
import { EXAMPLE_TAB } from './tab/fixtures'

const events = (() => {
  const r = parseTab(EXAMPLE_TAB)
  if (!r.ok) throw new Error(r.error)
  return r.tab.events
})()

describe('sugestão de revisão', () => {
  it('não sugere nada sem histórico', () => {
    expect(suggestReview(events, [], {})).toEqual([])
  })

  it('prioriza eventos difíceis e com muitos erros', () => {
    const now = Date.now()
    const practice = {
      2: { attempts: 10, hits: 2, lastAt: new Date(now).toISOString() },
      5: { attempts: 10, hits: 9, lastAt: new Date(now).toISOString() },
    }
    const result = suggestReview(events, [7], practice, now)
    expect(result.map((s) => s.eventId)).toEqual([7, 2])
    expect(result[1].reason).toContain('80%')
  })

  it('empurra para cima o que está há mais tempo sem prática', () => {
    const now = Date.now()
    const practice = {
      1: { attempts: 4, hits: 0, lastAt: new Date(now - 5 * 86400000).toISOString() },
      3: { attempts: 4, hits: 0, lastAt: new Date(now).toISOString() },
    }
    const result = suggestReview(events, [], practice, now)
    expect(result[0].eventId).toBe(1)
    expect(result[0].reason).toContain('5 dia')
  })

  it('monta um intervalo curto de prática dentro dos limites', () => {
    expect(reviewRange(0, 11)).toEqual([0, 1])
    expect(reviewRange(10, 11)).toEqual([9, 10])
    expect(reviewRange(5, 11)).toEqual([4, 6])
  })
})
