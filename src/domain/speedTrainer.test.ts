import { describe, expect, it } from 'vitest'
import { speedForLoop } from './speedTrainer'

describe('treino de velocidade', () => {
  const trainer = { enabled: true, start: 0.5, step: 0.1, target: 0.8 }
  it('sobe um passo por volta e para no alvo', () => {
    expect([0, 1, 2, 3, 4, 9].map((n) => speedForLoop(trainer, n))).toEqual([0.5, 0.6, 0.7, 0.8, 0.8, 0.8])
  })
})
