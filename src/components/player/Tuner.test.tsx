import { describe, expect, it, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEFAULT_SETUP, midiToFrequency } from '../../domain/music/tuning'

let emit: ((r: { frequency: number; midi: number; cents: number; clarity: number } | null) => void) | null = null

vi.mock('../../audio/pitch', () => ({
  MicError: class extends Error {},
  MicListener: class {
    async start(cb: typeof emit) {
      emit = cb
    }
    stop() {}
  },
}))

const { Tuner } = await import('./Tuner')

describe('Tuner', () => {
  it('mostra a nota, a corda mais próxima e se está afinada', async () => {
    render(<Tuner setup={DEFAULT_SETUP} />)
    await userEvent.click(screen.getByRole('button', { name: /Afinador pelo microfone/ }))
    expect(screen.getByText(/Toque uma corda solta/)).toBeInTheDocument()
    act(() => emit!({ frequency: midiToFrequency(45 - 0.3), midi: 45, cents: -30, clarity: 1 }))
    expect(screen.getByText('A2')).toBeInTheDocument()
    expect(screen.getByText(/5ª corda \(Lá\), -30 cents/)).toBeInTheDocument()
    expect(screen.getByText(/está baixa/)).toBeInTheDocument()
    for (let i = 0; i < 7; i++) act(() => emit!({ frequency: 110, midi: 45, cents: 0, clarity: 1 }))
    expect(screen.getByText('Afinada!')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Desligar afinador/ }))
    expect(screen.queryByText('Afinada!')).toBeNull()
  })
})
