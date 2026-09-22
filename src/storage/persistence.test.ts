import { beforeEach, describe, expect, it } from 'vitest'
import { LIBRARY_KEY, clearAll, createSavedTab, loadLibrary, saveLibrary } from './persistence'

describe('biblioteca em localStorage', () => {
  beforeEach(() => localStorage.clear())

  it('começa vazia', () => {
    expect(loadLibrary()).toEqual({ tabs: [], currentId: null })
  })

  it('salva e recarrega tabs', () => {
    const tab = createSavedTab('e|--3--|', 'Riff')
    saveLibrary({ tabs: [tab], currentId: tab.id })
    const loaded = loadLibrary()
    expect(loaded.tabs[0].name).toBe('Riff')
    expect(loaded.currentId).toBe(tab.id)
  })

  it('migra a sessão antiga (v1) para a biblioteca', () => {
    localStorage.setItem(
      'tabfacil:v1',
      JSON.stringify({ version: 1, tabText: 'e|--3--|', speed: 0.75, currentIndex: 0 }),
    )
    const loaded = loadLibrary()
    expect(loaded.tabs).toHaveLength(1)
    expect(loaded.tabs[0].speed).toBe(0.75)
    expect(localStorage.getItem('tabfacil:v1')).toBeNull()
    expect(localStorage.getItem(LIBRARY_KEY)).not.toBeNull()
  })

  it('descarta entradas corrompidas', () => {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify({ tabs: [{ id: 'x' }, { nope: 1 }], currentId: 'x' }))
    expect(loadLibrary()).toEqual({ tabs: [], currentId: null })
  })

  it('apaga tudo', () => {
    saveLibrary({ tabs: [createSavedTab('e|--3--|', 'Riff')], currentId: null })
    clearAll()
    expect(localStorage.getItem(LIBRARY_KEY)).toBeNull()
  })

  it('preserva o ritmo gravado e completa preferências novas com o padrão', async () => {
    const { loadPrefs, PREFS_KEY } = await import('./persistence')
    const tab = createSavedTab('e|--3--|', 'Riff', { rhythm: { durations: {}, pausesAfter: [], recorded: { baseMs: 500, units: { 0: 2 } } } })
    saveLibrary({ tabs: [tab], currentId: null })
    expect(loadLibrary().tabs[0].rhythm.recorded).toEqual({ baseMs: 500, units: { 0: 2 } })
    localStorage.setItem(PREFS_KEY, JSON.stringify({ countIn: false, drums: 'jazz' }))
    const prefs = loadPrefs()
    expect(prefs).toMatchObject({ countIn: false, drums: 'off', playRepeats: true, metronome: false, practiceDays: [] })
    expect(prefs.viewPrefs.leftHanded).toBe(false)
  })
})
