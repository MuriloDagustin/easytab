import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransportBar } from './TransportBar'

function setup(overrides: Partial<Parameters<typeof TransportBar>[0]> = {}) {
  const props = {
    index: 2,
    total: 10,
    playing: false,
    speed: 1,
    canPrev: true,
    canNext: true,
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onPlayEvent: vi.fn(),
    onTogglePlay: vi.fn(),
    onSpeed: vi.fn(),
    ...overrides,
  }
  render(<TransportBar {...props} />)
  return props
}

describe('TransportBar', () => {
  it('chama próximo e anterior', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Próxima nota' }))
    await userEvent.click(screen.getByRole('button', { name: 'Nota anterior' }))
    expect(props.onNext).toHaveBeenCalledOnce()
    expect(props.onPrev).toHaveBeenCalledOnce()
  })

  it('desabilita anterior no começo e próximo no fim', () => {
    setup({ canPrev: false, canNext: false })
    expect(screen.getByRole('button', { name: 'Nota anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Próxima nota' })).toBeDisabled()
  })

  it('mostra pausar enquanto reproduz', () => {
    setup({ playing: true })
    expect(screen.getByRole('button', { name: 'Pausar a reprodução' })).toBeInTheDocument()
  })

  it('muda a velocidade e informa a posição', async () => {
    const props = setup()
    expect(screen.getByText('Nota 3 de 10')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText(/Velocidade/), '0.5')
    expect(props.onSpeed).toHaveBeenCalledWith(0.5)
  })

  it('fica fixa no rodapé', () => {
    setup()
    expect(screen.getByRole('toolbar', { name: 'Controles de reprodução' }).className).toContain('sticky bottom-0')
  })
})
