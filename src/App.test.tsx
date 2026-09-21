import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { STORAGE_KEY } from './storage/persistence'

vi.mock('./audio/player', async () => {
  const actual = await vi.importActual<typeof import('./audio/player')>('./audio/player')
  return {
    ...actual,
    TabPlayer: class {
      playEvent = vi.fn().mockResolvedValue(undefined)
      playSequence = vi.fn().mockResolvedValue(undefined)
      pause = vi.fn()
      dispose = vi.fn()
    },
  }
})

describe('fluxo principal', () => {
  beforeEach(() => localStorage.clear())

  async function openExample() {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /tablatura de exemplo/i }))
    await user.click(screen.getByRole('button', { name: 'Processar tablatura' }))
    return user
  }

  it('leva da tela inicial ao player com as três visualizações', async () => {
    await openExample()
    expect(screen.getByRole('heading', { name: 'Tablatura' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'O que fazer agora' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Braço da guitarra/ })).toBeInTheDocument()
    expect(screen.getByText('Toque a 3ª corda (Sol) solta.')).toBeInTheDocument()
  })

  it('navega nota por nota e atualiza instrução e braço', async () => {
    const user = await openExample()
    await user.click(screen.getByRole('button', { name: 'Próxima nota' }))
    expect(screen.getByText('Toque a 3ª corda (Sol) na casa 2.')).toBeInTheDocument()
    expect(document.querySelector('[data-string="3"][data-fret="2"]')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nota anterior' }))
    expect(screen.getByText('Toque a 3ª corda (Sol) solta.')).toBeInTheDocument()
  })

  it('responde aos atalhos de teclado', async () => {
    const user = await openExample()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(screen.getByText(/Passo 3 de 11/)).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText(/Passo 2 de 11/)).toBeInTheDocument()
  })

  it('seleciona um evento clicando na tablatura', async () => {
    const user = await openExample()
    await user.click(screen.getAllByRole('button', { name: 'Evento 6' })[0])
    expect(screen.getByText(/Passo 6 de 11/)).toBeInTheDocument()
  })

  it('descreve notas simultâneas', async () => {
    const user = await openExample()
    await user.click(screen.getAllByRole('button', { name: 'Evento 8' })[0])
    expect(
      screen.getByText('Toque ao mesmo tempo: 1ª corda (Mi agudo) na casa 3 e 2ª corda (Si) na casa 5.'),
    ).toBeInTheDocument()
  })

  it('mostra a legenda educacional quando pedida', async () => {
    const user = await openExample()
    await user.click(
      within(screen.getByRole('heading', { name: 'Como ler a tablatura' }).parentElement!).getByRole('button'),
    )
    expect(screen.getByText(/Corda solta: toque a corda sem apertar/)).toBeInTheDocument()
    expect(screen.getByText(/normalmente não informa a duração/)).toBeInTheDocument()
  })

  it('salva a sessão e apaga quando pedido', async () => {
    const user = await openExample()
    await user.click(screen.getByRole('button', { name: 'Próxima nota' }))
    await vi.waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull())
    await user.click(screen.getByRole('button', { name: 'Apagar dados salvos' }))
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(screen.getByRole('heading', { name: 'Tab Fácil', level: 1 })).toBeInTheDocument()
  })

  it('oferece continuar quando há sessão salva', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        tabText: 'e|--3--5--|\nB|--------|\nG|--------|\nD|--------|\nA|--------|\nE|--------|',
        speed: 1,
        currentIndex: 1,
        loopEnabled: false,
        loopStart: 0,
        loopEnd: 1,
        viewPrefs: { showLegend: false, showFingers: true, showPitches: true },
        savedAt: new Date().toISOString(),
      }),
    )
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Continuar de onde parei/ }))
    expect(screen.getByText(/Passo 2 de 2/)).toBeInTheDocument()
  })

  it('mostra erro quando o texto não é uma tablatura', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Colar tablatura/ }))
    await user.type(screen.getByLabelText('Tablatura em texto'), 'isso nao e uma tab')
    await user.click(screen.getByRole('button', { name: 'Processar tablatura' }))
    expect(screen.getByRole('alert')).toHaveTextContent('6 cordas')
  })
})
