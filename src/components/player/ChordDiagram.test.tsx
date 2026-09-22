import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChordDiagram } from './ChordDiagram'

describe('ChordDiagram', () => {
  it('desenha cordas soltas, abafadas e dedos do C', () => {
    const { container } = render(<ChordDiagram name="C" />)
    expect(screen.getByRole('img', { name: 'Diagrama do acorde C' })).toBeInTheDocument()
    expect(container.querySelectorAll('[data-muted]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-open]')).toHaveLength(2)
    expect(container.querySelector('[data-dot="5:3"] text')?.textContent).toBe('3')
  })

  it('mostra pestana e casa inicial em formas altas', () => {
    const { container } = render(<ChordDiagram name="C#m" />)
    expect(container.querySelector('[data-barre]')).toBeInTheDocument()
    expect(screen.getByText('4ª')).toBeInTheDocument()
  })

  it('monta a forma na afinação escolhida', () => {
    const { container } = render(<ChordDiagram name="D5" tuning={[38, 45, 50, 55, 59, 64]} />)
    expect(container.querySelectorAll('[data-open]')).toHaveLength(3)
    expect(container.querySelectorAll('[data-dot]')).toHaveLength(0)
  })

  it('espelha para canhoto', () => {
    const normal = render(<ChordDiagram name="G" />).container.querySelector('[data-dot="6:3"] circle')!.getAttribute('cx')
    const lefty = render(<ChordDiagram name="G" leftHanded />).container.querySelector('[data-dot="6:3"] circle')!.getAttribute('cx')
    expect(Number(lefty)).toBeGreaterThan(Number(normal))
  })

  it('avisa quando não conhece a cifra', () => {
    render(<ChordDiagram name="Hx" />)
    expect(screen.getByText(/Não conheço/)).toBeInTheDocument()
  })
})
