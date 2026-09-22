import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { EXAMPLE_TAB } from './domain/tab/fixtures'
import { encodeShare } from './share/url'
import { LIBRARY_KEY, createSavedTab } from './storage/persistence'

vi.mock('./audio/player', async () => {
  const actual = await vi.importActual<typeof import('./audio/player')>('./audio/player')
  return {
    ...actual,
    TabPlayer: class {
      playEvent = vi.fn().mockResolvedValue(undefined)
      playOpenString = vi.fn().mockResolvedValue(undefined)
      playSequence = vi.fn().mockResolvedValue(undefined)
      pause = vi.fn()
      dispose = vi.fn()
      setTimbre = vi.fn()
      setLoadingListener = vi.fn()
    },
  }
})

describe('fluxo principal', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
  })

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

  it('salva na biblioteca e apaga tudo quando pedido', async () => {
    const user = await openExample()
    await user.click(screen.getByRole('button', { name: 'Próxima nota' }))
    await vi.waitFor(() => expect(localStorage.getItem(LIBRARY_KEY)).toContain('"currentIndex":1'))
    await user.click(screen.getByRole('button', { name: 'Apagar dados salvos' }))
    expect(localStorage.getItem(LIBRARY_KEY)).toBeNull()
    expect(screen.getByRole('heading', { name: 'Tab Fácil', level: 1 })).toBeInTheDocument()
    expect(screen.queryByText('Minhas tablaturas')).toBeNull()
  })

  it('lista, renomeia e reabre tabs da biblioteca', async () => {
    const saved = createSavedTab(EXAMPLE_TAB, 'Riff de teste', { currentIndex: 3 })
    localStorage.setItem(LIBRARY_KEY, JSON.stringify({ tabs: [saved], currentId: null }))
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByText('Minhas tablaturas')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Renomear Riff de teste' }))
    const input = screen.getByLabelText('Nome da tablatura')
    await user.clear(input)
    await user.type(input, 'Intro{Enter}')
    await user.click(screen.getByRole('button', { name: /^Intro/ }))
    expect(screen.getByText(/Passo 4 de 11/)).toBeInTheDocument()
    expect(screen.getByText('Intro')).toBeInTheDocument()
  })

  it('filtra por corda e navega só nela', async () => {
    const user = await openExample()
    await user.selectOptions(screen.getByLabelText('Filtrar por corda'), '1')
    expect(screen.getByText(/Passo 8 de 11/)).toBeInTheDocument()
    expect(screen.getByText('Toque a 1ª corda (Mi agudo) na casa 3.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Próxima nota' }))
    expect(screen.getByText(/Passo 9 de 11/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próxima nota' })).toBeDisabled()
  })

  it('marca trecho difícil e sugere revisão', async () => {
    const user = await openExample()
    await user.click(screen.getByRole('button', { name: /Marcar como difícil/ }))
    expect(screen.getByRole('button', { name: /Marcado como difícil/ })).toBeInTheDocument()
    expect(screen.getByText(/marcado como difícil$/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Praticar este trecho' }))
    expect(screen.getByRole('checkbox', { name: 'Repetir' })).toBeChecked()
    expect(screen.getByText('Notas 1 a 2')).toBeInTheDocument()
  })

  it('ajusta ritmo, afinação e capo', async () => {
    const user = await openExample()
    await user.click(screen.getByRole('radio', { name: 'Longa' }))
    expect(screen.getByRole('radio', { name: 'Longa' })).toHaveAttribute('aria-checked', 'true')
    await user.selectOptions(screen.getByLabelText('Afinação'), 'drop-d')
    await user.selectOptions(screen.getByLabelText('Capotraste'), '2')
    await user.click(screen.getAllByRole('button', { name: 'Evento 1' })[0])
    expect(screen.getByText('Toque a 3ª corda (Lá) solta.')).toBeInTheDocument()
  })

  it('abre uma tab recebida por link', async () => {
    window.location.hash = `#${encodeShare({ text: EXAMPLE_TAB, tuningId: 'drop-d' })}`
    render(<App />)
    expect(screen.getByText(/recebida por link/)).toBeInTheDocument()
    expect(screen.getByText(/Passo 1 de 11/)).toBeInTheDocument()
    expect((screen.getByLabelText('Afinação') as HTMLSelectElement).value).toBe('drop-d')
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
