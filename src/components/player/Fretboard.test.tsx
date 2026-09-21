import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Fretboard } from './Fretboard'
import type { TabEvent } from '../../domain/tab/types'
import { DEFAULT_SETUP, getTuning } from '../../domain/music/tuning'

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
        setup={DEFAULT_SETUP}
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
        setup={DEFAULT_SETUP}
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
        setup={DEFAULT_SETUP}
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
        setup={DEFAULT_SETUP}
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
        setup={DEFAULT_SETUP}
      />,
    )
    expect(container.querySelector('[data-string="2"][data-fret="5"] text')).toBeNull()
  })

  it('marca corda abafada com X', () => {
    const { container } = render(
      <Fretboard
        event={event([{ string: 5, fret: 0, techniques: [], muted: true }])}
        minFret={1}
        maxFret={4}
        fingers={null}
        showFingers
        setup={DEFAULT_SETUP}
      />,
    )
    expect(container.querySelector('[data-string="5"][data-fret="x"]')).toBeInTheDocument()
  })

  it('mostra as letras da afinação escolhida e permite ouvir a corda', async () => {
    const onPlayString = vi.fn()
    render(
      <Fretboard
        event={event([])}
        minFret={1}
        maxFret={4}
        fingers={null}
        showFingers
        setup={{ tuning: getTuning('drop-d'), capo: 0 }}
        onPlayString={onPlayString}
      />,
    )
    const button = screen.getByRole('button', { name: /6ª corda solta \(Ré\)/ })
    await userEvent.click(button)
    expect(onPlayString).toHaveBeenCalledWith(6)
  })
})
