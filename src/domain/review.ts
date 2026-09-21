import type { PracticeRecord } from '../storage/persistence'
import type { TabEvent } from './tab/types'

export interface ReviewSuggestion {
  eventId: number
  reason: string
  score: number
}

const DAY = 24 * 60 * 60 * 1000

/**
 * Prioriza trechos marcados como difíceis e os que erram mais, com um empurrão
 * para o que está há mais tempo sem prática (repetição espaçada simples).
 */
export function suggestReview(
  events: TabEvent[],
  hardEvents: number[],
  practice: Record<number, PracticeRecord>,
  now = Date.now(),
  limit = 3,
): ReviewSuggestion[] {
  const suggestions: ReviewSuggestion[] = []
  for (const event of events) {
    const record = practice[event.id]
    const isHard = hardEvents.includes(event.id)
    const missRate = record && record.attempts > 0 ? 1 - record.hits / record.attempts : 0
    const daysSince = record ? (now - new Date(record.lastAt).getTime()) / DAY : isHard ? 7 : 0

    let score = 0
    const reasons: string[] = []
    if (isHard) {
      score += 3
      reasons.push('marcado como difícil')
    }
    if (missRate > 0.4 && record) {
      score += 2 + missRate
      reasons.push(`errou ${Math.round(missRate * 100)}% das vezes`)
    }
    if (score > 0) {
      score += Math.min(daysSince, 7) / 7
      if (record && daysSince >= 1) reasons.push(`sem praticar há ${Math.floor(daysSince)} dia(s)`)
      suggestions.push({ eventId: event.id, score, reason: reasons.join(', ') })
    }
  }
  return suggestions.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** Intervalo curto em volta do evento para praticar em loop. */
export function reviewRange(eventId: number, total: number, radius = 1): [number, number] {
  return [Math.max(0, eventId - radius), Math.min(total - 1, eventId + radius)]
}
