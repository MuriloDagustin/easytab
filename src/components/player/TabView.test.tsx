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
    render(<TabView tab={tab()} currentIndex={2} onSelect={() => {}} />)
    const current = screen.getAllByRole('button', { current: 'step' })
    expect(current.length).toBeGreaterThan(0)
    expect(current[0]).toHaveAccessibleName('Evento 3')
  })

  it('seleciona o evento ao clicar na tab', async () => {
    const onSelect = vi.fn()
    render(<TabView tab={tab()} currentIndex={0} onSelect={onSelect} />)
    await userEvent.click(screen.getAllByRole('button', { name: 'Evento 5' })[0])
    expect(onSelect).toHaveBeenCalledWith(4)
  })

  it('mostra as seis linhas de cada bloco', () => {
    const parsed = tab()
    const { container } = render(<TabView tab={parsed} currentIndex={0} onSelect={() => {}} />)
    expect(container.querySelectorAll('pre > div > div')).toHaveLength(6)
  })
})
