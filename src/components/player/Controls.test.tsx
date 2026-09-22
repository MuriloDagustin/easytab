import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Controls } from './Controls'

function setup(overrides: Partial<Parameters<typeof Controls>[0]> = {}) {
  const props = {
    visiblePosition: 3,
    visibleTotal: 10,
    loopEnabled: false,
    loopStart: 0,
    loopEnd: 9,
    countIn: true,
    stringFilter: null,
    onRestart: vi.fn(),
    onToggleLoop: vi.fn(),
    onSetLoopStart: vi.fn(),
    onSetLoopEnd: vi.fn(),
    onCountIn: vi.fn(),
    onStringFilter: vi.fn(),
    ...overrides,
  }
  render(<Controls {...props} />)
  return props
}

describe('Controls', () => {
  it('reinicia', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Reiniciar do começo' }))
    expect(props.onRestart).toHaveBeenCalledOnce()
  })

  it('define o intervalo de repetição', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Início aqui' }))
    await userEvent.click(screen.getByRole('button', { name: 'Fim aqui' }))
    expect(props.onSetLoopStart).toHaveBeenCalledOnce()
    expect(props.onSetLoopEnd).toHaveBeenCalledOnce()
  })

  it('filtra por corda e mostra a posição dentro da corda', async () => {
    const props = setup({ stringFilter: 2 })
    expect(screen.getByText('3 de 10 nesta corda')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por corda'), '3')
    expect(props.onStringFilter).toHaveBeenCalledWith(3)
  })

  it('liga e desliga a contagem', async () => {
    const props = setup()
    await userEvent.click(screen.getByLabelText('Contagem antes de tocar'))
    expect(props.onCountIn).toHaveBeenCalledWith(false)
  })
})
