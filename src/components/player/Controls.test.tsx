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
    metronome: false,
    drums: 'off' as const,
    playRepeats: true,
    hasRepeats: true,
    trainer: { enabled: false, start: 0.5, step: 0.05, target: 1 },
    onMetronome: vi.fn(),
    onDrums: vi.fn(),
    onPlayRepeats: vi.fn(),
    onTrainer: vi.fn(),
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

  it('liga metrônomo, escolhe bateria e desliga repetições', async () => {
    const props = setup()
    await userEvent.click(screen.getByLabelText('Metrônomo'))
    await userEvent.selectOptions(screen.getByLabelText('Bateria'), 'rock')
    await userEvent.click(screen.getByLabelText(/repetições indicadas/))
    expect(props.onMetronome).toHaveBeenCalledWith(true)
    expect(props.onDrums).toHaveBeenCalledWith('rock')
    expect(props.onPlayRepeats).toHaveBeenCalledWith(false)
  })

  it('esconde a opção de repetições quando a tab não tem nenhuma', () => {
    setup({ hasRepeats: false })
    expect(screen.queryByLabelText(/repetições indicadas/)).toBeNull()
  })

  it('configura o treino de velocidade', async () => {
    const props = setup()
    await userEvent.click(screen.getByLabelText('Acelerar a cada volta'))
    await userEvent.selectOptions(screen.getByLabelText('Até'), '1.25')
    expect(props.onTrainer).toHaveBeenCalledWith({ enabled: true })
    expect(props.onTrainer).toHaveBeenCalledWith({ target: 1.25 })
  })
})
