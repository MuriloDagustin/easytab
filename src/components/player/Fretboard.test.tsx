import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Fretboard } from './Fretboard'
import type { TabEvent } from '../../domain/tab/types'

const event = (notes: TabEvent['notes']): TabEvent => ({ id: 0, blockIndex: 0, column: 0, width: 1, notes })

describe('Fretboard', () => {
  it('marca a corda e a casa certas', () => {
    const { container } = render(
      <Fretboard
        event={event([{ string: 2, fret: 5, techniques: [] }])}
        minFret={4}
        maxFret={8}
        fingers={null}
        showFingers
      />,
    )
    expect(container.querySelector('[data-string="2"][data-fret="5"]')).toBeInTheDocument()
  })

  it('mostra marcador distinto para corda solta', () => {
    const { container } = render(
      <Fretboard
        event={event([{ string: 3, fret: 0, techniques: [] }])}
        minFret={1}
        maxFret={4}
        fingers={null}
        showFingers
      />,
    )
    const marker = container.querySelector('[data-string="3"][data-fret="0"] circle')
    expect(marker).toHaveAttribute('fill', 'none')
  })

  it('marca as duas notas quando são simultâneas', () => {
    const { container } = render(
      <Fretboard
        event={event([
          { string: 1, fret: 3, techniques: [] },
          { string: 2, fret: 5, techniques: [] },
        ])}
        minFret={3}
        maxFret={6}
        fingers={null}
        showFingers
      />,
    )
    expect(container.querySelector('[data-string="1"][data-fret="3"]')).toBeInTheDocument()
    expect(container.querySelector('[data-string="2"][data-fret="5"]')).toBeInTheDocument()
  })

  it('exibe o dedo sugerido quando há sugestão', () => {
    const { container } = render(
      <Fretboard
        event={event([{ string: 2, fret: 5, techniques: [] }])}
        minFret={5}
        maxFret={8}
        fingers={new Map([['2:5', 1]])}
        showFingers
      />,
    )
    expect(container.querySelector('[data-string="2"][data-fret="5"] text')?.textContent).toBe('1')
  })

  it('não exibe dedo quando a preferência está desligada', () => {
    const { container } = render(
      <Fretboard
        event={event([{ string: 2, fret: 5, techniques: [] }])}
        minFret={5}
        maxFret={8}
        fingers={new Map([['2:5', 1]])}
        showFingers={false}
      />,
    )
    expect(container.querySelector('[data-string="2"][data-fret="5"] text')).toBeNull()
  })
})
