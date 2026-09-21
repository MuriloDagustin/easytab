import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Controls } from './Controls'

function setup(overrides: Partial<Parameters<typeof Controls>[0]> = {}) {
  const props = {
    index: 2,
    total: 10,
    playing: false,
    speed: 1,
    loopEnabled: false,
    loopStart: 0,
    loopEnd: 9,
    visiblePosition: 3,
    visibleTotal: 10,
    countIn: true,
    stringFilter: null,
    canPrev: true,
    canNext: true,
    onCountIn: vi.fn(),
    onStringFilter: vi.fn(),
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onPlayEvent: vi.fn(),
    onTogglePlay: vi.fn(),
    onRestart: vi.fn(),
    onSpeed: vi.fn(),
    onToggleLoop: vi.fn(),
    onSetLoopStart: vi.fn(),
    onSetLoopEnd: vi.fn(),
    ...overrides,
  }
  render(<Controls {...props} />)
  return props
}

describe('Controls', () => {
  it('chama próximo e anterior', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Próxima nota' }))
    await userEvent.click(screen.getByRole('button', { name: 'Nota anterior' }))
    expect(props.onNext).toHaveBeenCalledOnce()
    expect(props.onPrev).toHaveBeenCalledOnce()
  })

  it('desabilita anterior no começo e próximo no fim', () => {
    setup({ index: 0, canPrev: false, canNext: false })
    expect(screen.getByRole('button', { name: 'Nota anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Próxima nota' })).toBeDisabled()
  })

  it('filtra por corda', async () => {
    const props = setup()
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por corda'), '3')
    expect(props.onStringFilter).toHaveBeenCalledWith(3)
  })

  it('liga e desliga a contagem', async () => {
    const props = setup()
    await userEvent.click(screen.getByLabelText('Contagem antes de tocar'))
    expect(props.onCountIn).toHaveBeenCalledWith(false)
  })

  it('mostra pausar enquanto reproduz', () => {
    setup({ playing: true })
    expect(screen.getByRole('button', { name: 'Pausar a reprodução' })).toBeInTheDocument()
  })

  it('muda a velocidade', async () => {
    const props = setup()
    await userEvent.selectOptions(screen.getByLabelText(/Velocidade/), '0.5')
    expect(props.onSpeed).toHaveBeenCalledWith(0.5)
  })

  it('define o intervalo de repetição', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Início aqui' }))
    await userEvent.click(screen.getByRole('button', { name: 'Fim aqui' }))
    expect(props.onSetLoopStart).toHaveBeenCalledOnce()
    expect(props.onSetLoopEnd).toHaveBeenCalledOnce()
  })

  it('informa a posição atual', () => {
    setup()
    expect(screen.getByText('Nota 3 de 10')).toBeInTheDocument()
  })
})
