const MAX_DAYS = 400

export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addPracticeDay(days: string[], key: string): string[] {
  if (days.includes(key)) return days
  return [...days, key].sort().slice(-MAX_DAYS)
}

function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d - 1))
}

/** Dias seguidos até hoje; se hoje ainda não teve prática, conta até ontem. */
export function currentStreak(days: string[], today: string): number {
  const set = new Set(days)
  let cursor = set.has(today) ? today : previousDay(today)
  let count = 0
  while (set.has(cursor)) {
    count++
    cursor = previousDay(cursor)
  }
  return count
}

export function bestStreak(days: string[]): number {
  const sorted = [...new Set(days)].sort()
  let best = 0
  let run = 0
  sorted.forEach((day, i) => {
    run = i > 0 && previousDay(day) === sorted[i - 1] ? run + 1 : 1
    best = Math.max(best, run)
  })
  return best
}

export function stars(hits: number, attempts: number): number {
  if (!attempts) return 0
  const rate = hits / attempts
  return rate >= 0.9 ? 3 : rate >= 0.7 ? 2 : rate >= 0.4 ? 1 : 0
}
