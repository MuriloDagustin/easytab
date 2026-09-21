import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TabView } from './TabView'
import { parseTab } from '../../domain/tab/parser'
import { EXAMPLE_TAB } from '../../domain/tab/fixtures'

function tab() {
  const r = parseTab(EXAMPLE_TAB)
  if (!r.ok) throw new Error(r.error)
  return r.tab
}

describe('TabView', () => {
  it('destaca o evento atual', () => {
    render(<TabView tab={tab()} currentIndex={2} hardEvents={[]} stringFilter={null} onSelect={() => {}} />)
    const current = screen.getAllByRole('button', { current: 'step' })
    expect(current.length).toBeGreaterThan(0)
    expect(current[0]).toHaveAccessibleName('Evento 3')
  })

  it('seleciona o evento ao clicar na tab', async () => {
    const onSelect = vi.fn()
    render(<TabView tab={tab()} currentIndex={0} hardEvents={[]} stringFilter={null} onSelect={onSelect} />)
    await userEvent.click(screen.getAllByRole('button', { name: 'Evento 5' })[0])
    expect(onSelect).toHaveBeenCalledWith(4)
  })

  it('mostra as seis linhas de cada bloco', () => {
    const parsed = tab()
    const { container } = render(<TabView tab={parsed} currentIndex={0} hardEvents={[]} stringFilter={null} onSelect={() => {}} />)
    expect(container.querySelectorAll('[data-block] > div:not([data-heading])')).toHaveLength(6)
  })

  it('destaca eventos marcados como difíceis', () => {
    render(<TabView tab={tab()} currentIndex={0} hardEvents={[4]} stringFilter={null} onSelect={() => {}} />)
    expect(screen.getAllByRole('button', { name: 'Evento 5, marcado como difícil' }).length).toBeGreaterThan(0)
  })

  it('mostra a linha de cifras acima do bloco', () => {
    const r = parseTab(`  G     D\ne|--3-----3--|\nB|-----------|\nG|-----------|\nD|-----------|\nA|-----------|\nE|-----------|`)
    if (!r.ok) throw new Error(r.error)
    render(<TabView tab={r.tab} currentIndex={0} hardEvents={[]} stringFilter={null} onSelect={() => {}} />)
    expect(screen.getByText(/G\s+D/)).toBeInTheDocument()
  })

  it('mostra o título da seção acima do bloco', async () => {
    const { CIFRA_CLUB_TAB } = await import('../../domain/tab/fixtures')
    const r = parseTab(CIFRA_CLUB_TAB)
    if (!r.ok) throw new Error(r.error)
    render(<TabView tab={r.tab} currentIndex={0} hardEvents={[]} stringFilter={null} onSelect={() => {}} />)
    expect(screen.getByText('1º RIFF')).toBeInTheDocument()
    expect(screen.getByText(/ABAFANDO AS CORDAS/)).toBeInTheDocument()
  })
})
