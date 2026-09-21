import { describe, expect, it } from 'vitest'
import { appReducer, initialState, type AppState } from './appReducer'
import { EXAMPLE_TAB } from '../domain/tab/fixtures'

function processed(): AppState {
  const drafted = appReducer(initialState, { type: 'setDraft', text: EXAMPLE_TAB })
  return appReducer(drafted, { type: 'process' })
}

describe('appReducer', () => {
  it('processa a tab e abre o player', () => {
    const state = processed()
    expect(state.screen).toBe('player')
    expect(state.tab?.events.length).toBe(11)
    expect(state.currentIndex).toBe(0)
  })

  it('guarda o erro quando a entrada não é tablatura', () => {
    const drafted = appReducer(initialState, { type: 'setDraft', text: 'nada aqui' })
    const state = appReducer(drafted, { type: 'process' })
    expect(state.screen).toBe('home')
    expect(state.parseError).toContain('6 cordas')
  })

  it('avança e volta sem sair dos limites', () => {
    let state = processed()
    state = appReducer(state, { type: 'prev' })
    expect(state.currentIndex).toBe(0)
    state = appReducer(state, { type: 'next' })
    expect(state.currentIndex).toBe(1)
    state = appReducer(state, { type: 'setIndex', index: 999 })
    expect(state.currentIndex).toBe(10)
    state = appReducer(state, { type: 'next' })
    expect(state.currentIndex).toBe(10)
  })

  it('define intervalo de repetição a partir do evento atual', () => {
    let state = appReducer(processed(), { type: 'setIndex', index: 3 })
    state = appReducer(state, { type: 'setLoopStart' })
    state = appReducer(state, { type: 'setIndex', index: 6 })
    state = appReducer(state, { type: 'setLoopEnd' })
    expect([state.loopStart, state.loopEnd, state.loopEnabled]).toEqual([3, 6, true])
  })

  it('restaura uma sessão salva', () => {
    const state = appReducer(initialState, {
      type: 'restore',
      persisted: {
        version: 1,
        tabText: EXAMPLE_TAB,
        speed: 0.75,
        currentIndex: 4,
        loopEnabled: false,
        loopStart: 0,
        loopEnd: 10,
        viewPrefs: { showLegend: true, showFingers: false, showPitches: true },
        savedAt: new Date().toISOString(),
      },
    })
    expect(state.screen).toBe('player')
    expect(state.currentIndex).toBe(4)
    expect(state.speed).toBe(0.75)
    expect(state.viewPrefs.showLegend).toBe(true)
  })

  it('volta ao início ao resetar', () => {
    const state = appReducer(processed(), { type: 'reset' })
    expect(state.screen).toBe('home')
    expect(state.tab).toBeNull()
  })
})
