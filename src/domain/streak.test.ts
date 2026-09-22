import { describe, expect, it } from 'vitest'
import { addPracticeDay, bestStreak, currentStreak, dayKey, stars } from './streak'

describe('sequência de dias', () => {
  it('formata a data local', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('não duplica dias', () => {
    expect(addPracticeDay(['2026-09-20'], '2026-09-20')).toEqual(['2026-09-20'])
  })

  it('conta dias seguidos até hoje ou ontem', () => {
    const days = ['2026-09-18', '2026-09-20', '2026-09-21', '2026-09-22']
    expect(currentStreak(days, '2026-09-22')).toBe(3)
    expect(currentStreak(days, '2026-09-23')).toBe(3)
    expect(currentStreak(days, '2026-09-25')).toBe(0)
  })

  it('atravessa a virada do mês', () => {
    expect(currentStreak(['2026-08-31', '2026-09-01'], '2026-09-01')).toBe(2)
  })

  it('calcula a melhor sequência', () => {
    expect(bestStreak(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10', '2026-09-11'])).toBe(3)
  })

  it('dá estrelas pelo aproveitamento', () => {
    expect([stars(0, 0), stars(9, 10), stars(7, 10), stars(4, 10), stars(1, 10)]).toEqual([0, 3, 2, 1, 0])
  })
})
