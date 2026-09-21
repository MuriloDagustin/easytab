import { parseTab } from '../domain/tab/parser'
import type { ParsedTab } from '../domain/tab/types'
import { DEFAULT_VIEW_PREFS, type PersistedState, type ViewPreferences } from '../storage/persistence'

export type Screen = 'home' | 'text' | 'image' | 'player'

export interface AppState {
  screen: Screen
  /** Texto no editor, antes de processar. */
  draftText: string
  /** Texto efetivamente processado. */
  tabText: string
  tab: ParsedTab | null
  parseError: string | null
  currentIndex: number
  speed: number
  playing: boolean
  loopEnabled: boolean
  loopStart: number
  loopEnd: number
  viewPrefs: ViewPreferences
  ocrSource: 'image' | null
  hasSavedSession: boolean
}

export type AppAction =
  | { type: 'go'; screen: Screen }
  | { type: 'setDraft'; text: string }
  | { type: 'startFromImage'; text: string }
  | { type: 'process' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'setIndex'; index: number }
  | { type: 'setSpeed'; speed: number }
  | { type: 'setPlaying'; playing: boolean }
  | { type: 'toggleLoop' }
  | { type: 'setLoopStart' }
  | { type: 'setLoopEnd' }
  | { type: 'setPref'; key: keyof ViewPreferences; value: boolean }
  | { type: 'restore'; persisted: PersistedState }
  | { type: 'reset' }
  | { type: 'clearSaved' }

export const initialState: AppState = {
  screen: 'home',
  draftText: '',
  tabText: '',
  tab: null,
  parseError: null,
  currentIndex: 0,
  speed: 1,
  playing: false,
  loopEnabled: false,
  loopStart: 0,
  loopEnd: 0,
  viewPrefs: DEFAULT_VIEW_PREFS,
  ocrSource: null,
  hasSavedSession: false,
}

function clampIndex(state: AppState, index: number): number {
  const last = (state.tab?.events.length ?? 1) - 1
  return Math.min(Math.max(index, 0), Math.max(last, 0))
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'go':
      return {
        ...state,
        screen: action.screen,
        parseError: action.screen === state.screen ? state.parseError : null,
        ocrSource: action.screen === 'text' ? state.ocrSource : null,
        playing: false,
      }
    case 'setDraft':
      return { ...state, draftText: action.text, parseError: null }
    case 'startFromImage':
      return { ...state, screen: 'text', draftText: action.text, ocrSource: 'image', parseError: null }
    case 'process': {
      const result = parseTab(state.draftText)
      if (!result.ok) return { ...state, parseError: result.error }
      return {
        ...state,
        screen: 'player',
        tab: result.tab,
        tabText: state.draftText,
        parseError: null,
        currentIndex: 0,
        loopStart: 0,
        loopEnd: result.tab.events.length - 1,
        loopEnabled: false,
        playing: false,
        hasSavedSession: true,
      }
    }
    case 'next':
      return { ...state, currentIndex: clampIndex(state, state.currentIndex + 1) }
    case 'prev':
      return { ...state, currentIndex: clampIndex(state, state.currentIndex - 1) }
    case 'setIndex':
      return { ...state, currentIndex: clampIndex(state, action.index) }
    case 'setSpeed':
      return { ...state, speed: action.speed }
    case 'setPlaying':
      return { ...state, playing: action.playing }
    case 'toggleLoop':
      return { ...state, loopEnabled: !state.loopEnabled }
    case 'setLoopStart':
      return {
        ...state,
        loopStart: state.currentIndex,
        loopEnd: Math.max(state.loopEnd, state.currentIndex),
        loopEnabled: true,
      }
    case 'setLoopEnd':
      return {
        ...state,
        loopEnd: state.currentIndex,
        loopStart: Math.min(state.loopStart, state.currentIndex),
        loopEnabled: true,
      }
    case 'setPref':
      return { ...state, viewPrefs: { ...state.viewPrefs, [action.key]: action.value } }
    case 'restore': {
      const result = parseTab(action.persisted.tabText)
      if (!result.ok) return { ...state, hasSavedSession: false }
      const events = result.tab.events.length
      return {
        ...state,
        screen: 'player',
        tab: result.tab,
        tabText: action.persisted.tabText,
        draftText: action.persisted.tabText,
        currentIndex: Math.min(action.persisted.currentIndex, events - 1),
        speed: action.persisted.speed,
        loopEnabled: action.persisted.loopEnabled,
        loopStart: Math.min(action.persisted.loopStart, events - 1),
        loopEnd: Math.min(action.persisted.loopEnd || events - 1, events - 1),
        viewPrefs: action.persisted.viewPrefs,
        hasSavedSession: true,
        playing: false,
      }
    }
    case 'reset':
      return { ...initialState, viewPrefs: state.viewPrefs, hasSavedSession: state.hasSavedSession }
    case 'clearSaved':
      return { ...initialState, hasSavedSession: false }
  }
}
