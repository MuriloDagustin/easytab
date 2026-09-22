import { describe, expect, it } from 'vitest'
import { appReducer, currentSaved, initialState, visibleIndices, type AppState } from './appReducer'
import { EXAMPLE_TAB } from '../domain/tab/fixtures'

function processed(): AppState {
  const drafted = appReducer(initialState, { type: 'setDraft', text: EXAMPLE_TAB })
  return appReducer(drafted, { type: 'process' })
}

describe('appReducer', () => {
  it('processa a tab, abre o player e salva na biblioteca', () => {
    const state = processed()
    expect(state.screen).toBe('player')
    expect(state.tab?.events.length).toBe(11)
    expect(state.library.tabs).toHaveLength(1)
    expect(currentSaved(state)?.text).toBe(EXAMPLE_TAB)
  })

  it('guarda o erro quando a entrada não é tablatura', () => {
    const drafted = appReducer(initialState, { type: 'setDraft', text: 'nada aqui' })
    const state = appReducer(drafted, { type: 'process' })
    expect(state.screen).toBe('home')
    expect(state.parseError).toContain('6 cordas')
  })

  it('avança e volta sem sair dos limites e persiste a posição', () => {
    let state = processed()
    state = appReducer(state, { type: 'prev' })
    expect(state.currentIndex).toBe(0)
    state = appReducer(state, { type: 'next' })
    expect(state.currentIndex).toBe(1)
    expect(currentSaved(state)?.currentIndex).toBe(1)
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
    const saved = currentSaved(state)!
    expect([saved.loopStart, saved.loopEnd, saved.loopEnabled]).toEqual([3, 6, true])
  })

  it('editar a mesma tab sem mudar o texto mantém progresso; mudar o texto zera', () => {
    let state = appReducer(processed(), { type: 'setIndex', index: 4 })
    state = appReducer(state, { type: 'toggleHard' })
    state = appReducer(state, { type: 'go', screen: 'text' })
    state = appReducer(state, { type: 'process' })
    expect(state.library.tabs).toHaveLength(1)
    expect(state.currentIndex).toBe(4)
    expect(currentSaved(state)?.hardEvents).toEqual([4])

    state = appReducer(state, { type: 'go', screen: 'text' })
    state = appReducer(state, { type: 'setDraft', text: EXAMPLE_TAB.replace('--0--', '--1--') })
    state = appReducer(state, { type: 'process' })
    expect(state.library.tabs).toHaveLength(1)
    expect(state.currentIndex).toBe(0)
    expect(currentSaved(state)?.hardEvents).toEqual([])
  })

  it('nova tab pela tela inicial cria outra entrada', () => {
    let state = appReducer(processed(), { type: 'go', screen: 'home' })
    state = appReducer(state, { type: 'setDraft', text: 'e|--3--|\nB|-----|\nG|-----|\nD|-----|\nA|-----|\nE|-----|' })
    state = appReducer(state, { type: 'process' })
    expect(state.library.tabs).toHaveLength(2)
  })

  it('abre, renomeia e apaga tabs salvas', () => {
    let state = processed()
    const id = state.library.currentId!
    state = appReducer(state, { type: 'renameSaved', id, name: 'Meu riff' })
    expect(currentSaved(state)?.name).toBe('Meu riff')
    state = appReducer(state, { type: 'go', screen: 'home' })
    state = appReducer(state, { type: 'openSaved', id })
    expect(state.screen).toBe('player')
    state = appReducer(state, { type: 'deleteSaved', id })
    expect(state.library.tabs).toHaveLength(0)
    expect(state.screen).toBe('home')
  })

  it('filtro de corda restringe a navegação', () => {
    let state = appReducer(processed(), { type: 'setStringFilter', string: 1 })
    expect(visibleIndices(state)).toEqual([7, 8])
    expect(state.currentIndex).toBe(7)
    state = appReducer(state, { type: 'next' })
    expect(state.currentIndex).toBe(8)
    state = appReducer(state, { type: 'next' })
    expect(state.currentIndex).toBe(8)
    state = appReducer(state, { type: 'prev' })
    expect(state.currentIndex).toBe(7)
  })

  it('anota ritmo, afinação e capo na tab atual', () => {
    let state = appReducer(processed(), { type: 'setDuration', duration: 'long' })
    state = appReducer(state, { type: 'togglePause' })
    state = appReducer(state, { type: 'setTuning', tuningId: 'drop-d' })
    state = appReducer(state, { type: 'setCapo', capo: 2 })
    const saved = currentSaved(state)!
    expect(saved.rhythm.durations[0]).toBe('long')
    expect(saved.rhythm.pausesAfter).toEqual([0])
    expect(saved.tuningId).toBe('drop-d')
    expect(saved.capo).toBe(2)
  })

  it('registra prática', () => {
    let state = appReducer(processed(), { type: 'recordPractice', eventId: 0, hit: true })
    state = appReducer(state, { type: 'recordPractice', eventId: 0, hit: false })
    expect(currentSaved(state)?.practice[0]).toMatchObject({ attempts: 2, hits: 1 })
  })

  it('abre tab compartilhada por link e evita duplicar', () => {
    let state = appReducer(initialState, { type: 'openShared', payload: { text: EXAMPLE_TAB, tuningId: 'drop-d', capo: 1 } })
    expect(state.screen).toBe('player')
    expect(currentSaved(state)).toMatchObject({ tuningId: 'drop-d', capo: 1 })
    state = appReducer(state, { type: 'openShared', payload: { text: EXAMPLE_TAB } })
    expect(state.library.tabs).toHaveLength(1)
    expect(state.notice).toContain('já estava')
  })

  it('apaga tudo', () => {
    const state = appReducer(processed(), { type: 'clearAll' })
    expect(state.library.tabs).toHaveLength(0)
    expect(state.screen).toBe('home')
  })

  it('grava ritmo, marca dias de prática e ajusta o treino de velocidade', () => {
    let state = appReducer(processed(), { type: 'recordRhythm', recorded: { baseMs: 500, units: { 0: 2 } } })
    expect(currentSaved(state)?.rhythm.recorded).toEqual({ baseMs: 500, units: { 0: 2 } })
    state = appReducer(state, { type: 'clearRecordedRhythm' })
    expect(currentSaved(state)?.rhythm.recorded).toBeUndefined()
    state = appReducer(state, { type: 'markPracticeDay', day: '2026-09-21' })
    state = appReducer(state, { type: 'markPracticeDay', day: '2026-09-21' })
    expect(state.prefs.practiceDays).toEqual(['2026-09-21'])
    state = appReducer(state, { type: 'recordPractice', eventId: 0, hit: true })
    expect(state.prefs.practiceDays.length).toBe(2)
    state = appReducer(state, { type: 'setSpeedTrainer', patch: { enabled: true, target: 1.25 } })
    expect(state.prefs.speedTrainer).toMatchObject({ enabled: true, start: 0.5, target: 1.25 })
  })
})
