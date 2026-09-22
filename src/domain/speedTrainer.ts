export interface SpeedTrainer {
  enabled: boolean
  start: number
  step: number
  target: number
}

export const DEFAULT_SPEED_TRAINER: SpeedTrainer = { enabled: false, start: 0.5, step: 0.05, target: 1 }

/** Velocidade da volta `loop` (0 = primeira): sobe um passo por volta até o alvo. */
export function speedForLoop(trainer: SpeedTrainer, loop: number): number {
  const speed = Math.min(trainer.target, trainer.start + trainer.step * loop)
  return Math.round(speed * 100) / 100
}
