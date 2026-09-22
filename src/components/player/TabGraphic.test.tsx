import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TabGraphic } from './TabGraphic'
import { parseTab } from '../../domain/tab/parser'
import { CIFRA_CLUB_TAB, EXAMPLE_TAB } from '../../domain/tab/fixtures'
import { DEFAULT_SETUP } from '../../domain/music/tuning'

function tab(text = EXAMPLE_TAB) {
  const r = parseTab(text)
  if (!r.ok) throw new Error(r.error)
  return r.tab
}

describe('TabGraphic', () => {
  it('desenha um SVG por bloco com seis cordas e os números nas posições', () => {
    const { container } = render(
      <TabGraphic tab={tab()} currentIndex={0} hardEvents={[]} stringFilter={null} setup={DEFAULT_SETUP} onSelect={() => {}} />,
    )
    expect(container.querySelectorAll('svg')).toHaveLength(1)
    expect(container.querySelectorAll('svg line').length).toBeGreaterThanOrEqual(6)
    expect(container.querySelector('[data-string="3"][data-fret="0"]')).toBeInTheDocument()
    expect(container.querySelector('[data-string="2"][data-fret="5"]')).toBeInTheDocument()
  })

  it('destaca o evento atual e permite clicar em outro', async () => {
    const onSelect = vi.fn()
    render(<TabGraphic tab={tab()} currentIndex={2} hardEvents={[]} stringFilter={null} setup={DEFAULT_SETUP} onSelect={onSelect} />)
    expect(screen.getByRole('button', { current: 'step' })).toHaveAccessibleName('Evento 3')
    await userEvent.click(screen.getByRole('button', { name: 'Evento 8' }))
    expect(onSelect).toHaveBeenCalledWith(7)
  })

  it('mostra cifras, técnicas soltas, barras de compasso e títulos', () => {
    const { container } = render(
      <TabGraphic tab={tab(CIFRA_CLUB_TAB)} currentIndex={0} hardEvents={[]} stringFilter={null} setup={DEFAULT_SETUP} onSelect={() => {}} />,
    )
    expect(screen.getByText('1º RIFF')).toBeInTheDocument()
    const texts = [...container.querySelectorAll('svg text')].map((t) => t.textContent)
    expect(texts).toContain('~')
    expect(texts).toContain('h')
    expect(texts).toContain('/')
    expect(container.querySelectorAll('svg').length).toBe(6)
  })

  it('marca eventos difíceis no nome acessível', () => {
    render(<TabGraphic tab={tab()} currentIndex={0} hardEvents={[4]} stringFilter={null} setup={DEFAULT_SETUP} onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: 'Evento 5, marcado como difícil' })).toBeInTheDocument()
  })

  it('desenha a partitura com uma cabeça de nota por nota tocada', () => {
    const { container } = render(
      <TabGraphic tab={tab()} currentIndex={0} hardEvents={[]} stringFilter={null} setup={DEFAULT_SETUP} showNotation onSelect={() => {}} />,
    )
    expect(container.querySelector('[data-staff]')).toBeInTheDocument()
    const heads = container.querySelectorAll('.notehead')
    expect(heads.length).toBe(tab().events.reduce((n, e) => n + e.notes.length, 0))
  })

  it('cifras clicáveis e marca de repetição no título', async () => {
    const onChord = vi.fn()
    const text = `[Riff] 2X\n   G\n${['e', 'B', 'G', 'D', 'A', 'E'].map((l) => `${l}|${l === 'e' ? '--3--' : '-----'}|`).join('\n')}`
    render(<TabGraphic tab={tab(text)} currentIndex={0} hardEvents={[]} stringFilter={null} setup={DEFAULT_SETUP} onSelect={() => {}} onChord={onChord} />)
    expect(screen.getByText('seção ×2')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ver acorde G' }))
    expect(onChord).toHaveBeenCalledWith('G')
  })

  it('desenha a armadura e as figuras de duração quando há ritmo', () => {
    const { container } = render(
      <TabGraphic
        tab={tab()}
        currentIndex={0}
        hardEvents={[]}
        stringFilter={null}
        setup={DEFAULT_SETUP}
        showNotation
        fifths={2}
        keyName="Ré maior"
        quartersOf={(id) => (id === 0 ? 2 : 0.5)}
        onSelect={() => {}}
      />,
    )
    expect(container.querySelectorAll('[data-signature]')).toHaveLength(2)
    expect(container.querySelector('[data-notation-event="0"]')?.getAttribute('data-value')).toBe('mínima')
    expect(container.querySelector('[data-notation-event="1"]')?.getAttribute('data-value')).toBe('colcheia')
    expect(screen.getByText(/Tonalidade provável: Ré maior/)).toBeInTheDocument()
  })

  it('sem ritmo anotado mostra só as alturas, sem hastes', () => {
    const { container } = render(
      <TabGraphic tab={tab()} currentIndex={0} hardEvents={[]} stringFilter={null} setup={DEFAULT_SETUP} showNotation onSelect={() => {}} />,
    )
    expect(container.querySelectorAll('.stem')).toHaveLength(0)
    expect(screen.getByText(/Sem ritmo anotado/)).toBeInTheDocument()
  })

  it('mostra as instruções de salto', () => {
    const b = (n: string) => ['e', 'B', 'G', 'D', 'A', 'E'].map((l) => `${l}|${l === 'B' ? n : '-----'}|`).join('\n')
    render(
      <TabGraphic
        tab={tab(`[Refrão]\n${b('--2--')}\n\nRepete o refrão\n\n[Solo]\n${b('--4--')}\n\nVolta ao início`)}
        currentIndex={0}
        hardEvents={[]}
        stringFilter={null}
        setup={DEFAULT_SETUP}
        onSelect={() => {}}
      />,
    )
    expect(screen.getByText('antes: refrão')).toBeInTheDocument()
    expect(screen.getByText('No fim: volta para o início')).toBeInTheDocument()
  })
})
