import { parseTab } from '../domain/tab/parser'
import type { ParsedTab, StringNumber } from '../domain/tab/types'
import {
  EMPTY_RHYTHM,
  clearRecorded,
  mergeRecorded,
  setDuration,
  togglePause,
  type Duration,
  type RecordedRhythm,
  type RhythmAnnotations,
} from '../domain/rhythm'
import { addPracticeDay, dayKey } from '../domain/streak'
import type { SpeedTrainer } from '../domain/speedTrainer'
import type { DrumPattern } from '../audio/beat'
import { MAX_CAPO, getTuning } from '../domain/music/tuning'
import type { SharePayload } from '../share/url'
import type { Timbre } from '../audio/instruments'
import {
  DEFAULT_PREFS,
  createSavedTab,
  type GlobalPrefs,
  type Library,
  type PracticeRecord,
  type SavedTab,
  type ViewPreferences,
} from '../storage/persistence'

export type Screen = 'home' | 'text' | 'image' | 'player'

export interface AppState {
  screen: Screen
  library: Library
  prefs: GlobalPrefs
  /** Texto no editor, antes de processar. */
  draftText: string
  /** Quando o editor foi aberto a partir de uma tab salva, para atualizar em vez de criar. */
  editingId: string | null
  tab: ParsedTab | null
  parseError: string | null
  currentIndex: number
  playing: boolean
  stringFilter: StringNumber | null
  ocrSource: 'image' | null
  notice: string | null
}

export type AppAction =
  | { type: 'go'; screen: Screen }
  | { type: 'setDraft'; text: string }
  | { type: 'startFromImage'; text: string }
  | { type: 'process' }
  | { type: 'openSaved'; id: string }
  | { type: 'deleteSaved'; id: string }
  | { type: 'renameSaved'; id: string; name: string }
  | { type: 'openShared'; payload: SharePayload }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'setIndex'; index: number }
  | { type: 'setSpeed'; speed: number }
  | { type: 'setPlaying'; playing: boolean }
  | { type: 'toggleLoop' }
  | { type: 'setLoopStart' }
  | { type: 'setLoopEnd' }
  | { type: 'setLoopRange'; start: number; end: number }
  | { type: 'setPref'; key: keyof ViewPreferences; value: boolean }
  | { type: 'setTabStyle'; style: ViewPreferences['tabStyle'] }
  | { type: 'setCountIn'; value: boolean }
  | { type: 'setTimbre'; timbre: Timbre }
  | { type: 'setMetronome'; value: boolean }
  | { type: 'setDrums'; pattern: DrumPattern }
  | { type: 'setPlayRepeats'; value: boolean }
  | { type: 'setSpeedTrainer'; patch: Partial<SpeedTrainer> }
  | { type: 'markPracticeDay'; day?: string }
  | { type: 'recordRhythm'; recorded: RecordedRhythm }
  | { type: 'clearRecordedRhythm' }
  | { type: 'setTuning'; tuningId: string }
  | { type: 'setCapo'; capo: number }
  | { type: 'setDuration'; duration: Duration }
  | { type: 'togglePause' }
  | { type: 'toggleHard' }
  | { type: 'recordPractice'; eventId: number; hit: boolean }
  | { type: 'setStringFilter'; string: StringNumber | null }
  | { type: 'dismissNotice' }
  | { type: 'reset' }
  | { type: 'clearAll' }

export function createInitialState(library: Library, prefs: GlobalPrefs): AppState {
  return {
    screen: 'home',
    library,
    prefs,
    draftText: '',
    editingId: null,
    tab: null,
    parseError: null,
    currentIndex: 0,
    playing: false,
    stringFilter: null,
    ocrSource: null,
    notice: null,
  }
}

export const initialState: AppState = createInitialState({ tabs: [], currentId: null }, DEFAULT_PREFS)

export function currentSaved(state: AppState): SavedTab | null {
  return state.library.tabs.find((t) => t.id === state.library.currentId) ?? null
}

/** Índices dos eventos visíveis, considerando o filtro de corda. */
export function visibleIndices(state: AppState): number[] {
  if (!state.tab) return []
  if (state.stringFilter === null) return state.tab.events.map((e) => e.id)
  return state.tab.events.filter((e) => e.notes.some((n) => n.string === state.stringFilter)).map((e) => e.id)
}

function updateCurrent(state: AppState, patch: Partial<SavedTab> | ((tab: SavedTab) => Partial<SavedTab>)): AppState {
  const current = currentSaved(state)
  if (!current) return state
  const changes = typeof patch === 'function' ? patch(current) : patch
  const updated: SavedTab = { ...current, ...changes, updatedAt: new Date().toISOString() }
  return {
    ...state,
    library: { ...state.library, tabs: state.library.tabs.map((t) => (t.id === current.id ? updated : t)) },
  }
}

function clampIndex(state: AppState, index: number): number {
  const last = (state.tab?.events.length ?? 1) - 1
  return Math.min(Math.max(index, 0), Math.max(last, 0))
}

function moveIndex(state: AppState, direction: 1 | -1): AppState {
  const visible = visibleIndices(state)
  if (!visible.length) return state
  const position = visible.indexOf(state.currentIndex)
  let next: number
  if (position === -1) {
    next = direction === 1 ? (visible.find((i) => i > state.currentIndex) ?? visible.at(-1)!) : ([...visible].reverse().find((i) => i < state.currentIndex) ?? visible[0])
  } else {
    next = visible[Math.min(Math.max(position + direction, 0), visible.length - 1)]
  }
  return setIndex(state, next)
}

function setIndex(state: AppState, index: number): AppState {
  const clamped = clampIndex(state, index)
  return updateCurrent({ ...state, currentIndex: clamped }, { currentIndex: clamped })
}

function defaultName(library: Library, tab: ParsedTab): string {
  const chord = tab.events.find((e) => e.chord)?.chord
  const base = chord ? `Tablatura em ${chord}` : 'Tablatura'
  const existing = library.tabs.filter((t) => t.name.startsWith(base)).length
  return existing ? `${base} ${existing + 1}` : base
}

function openTab(state: AppState, saved: SavedTab, notice: string | null = null): AppState {
  const result = parseTab(saved.text)
  if (!result.ok) {
    return { ...state, screen: 'home', parseError: result.error, notice }
  }
  const total = result.tab.events.length
  const fixed: SavedTab = {
    ...saved,
    currentIndex: Math.min(saved.currentIndex, total - 1),
    loopStart: Math.min(saved.loopStart, total - 1),
    loopEnd: Math.min(saved.loopEnd || total - 1, total - 1),
  }
  const tabs = state.library.tabs.some((t) => t.id === fixed.id)
    ? state.library.tabs.map((t) => (t.id === fixed.id ? fixed : t))
    : [fixed, ...state.library.tabs]
  return {
    ...state,
    screen: 'player',
    library: { tabs, currentId: fixed.id },
    tab: result.tab,
    draftText: fixed.text,
    editingId: fixed.id,
    parseError: null,
    currentIndex: fixed.currentIndex,
    playing: false,
    stringFilter: null,
    ocrSource: null,
    notice,
  }
}

function markDay(state: AppState, day = dayKey(new Date())): AppState {
  const practiceDays = addPracticeDay(state.prefs.practiceDays, day)
  if (practiceDays === state.prefs.practiceDays) return state
  return { ...state, prefs: { ...state.prefs, practiceDays } }
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'go':
      return {
        ...state,
        screen: action.screen,
        parseError: action.screen === state.screen ? state.parseError : null,
        ocrSource: action.screen === 'text' ? state.ocrSource : null,
        editingId: action.screen === 'home' ? null : state.editingId,
        draftText: action.screen === 'home' ? '' : state.draftText,
        playing: false,
        notice: null,
      }
    case 'setDraft':
      return { ...state, draftText: action.text, parseError: null }
    case 'startFromImage':
      return { ...state, screen: 'text', draftText: action.text, ocrSource: 'image', parseError: null, editingId: null }
    case 'process': {
      const result = parseTab(state.draftText)
      if (!result.ok) return { ...state, parseError: result.error }
      const existing = state.editingId ? state.library.tabs.find((t) => t.id === state.editingId) : null
      const total = result.tab.events.length
      const saved: SavedTab = existing
        ? {
            ...existing,
            text: state.draftText,
            currentIndex: existing.text === state.draftText ? existing.currentIndex : 0,
            loopStart: 0,
            loopEnd: total - 1,
            loopEnabled: false,
            rhythm: existing.text === state.draftText ? existing.rhythm : EMPTY_RHYTHM,
            hardEvents: existing.text === state.draftText ? existing.hardEvents : [],
            practice: existing.text === state.draftText ? existing.practice : {},
          }
        : createSavedTab(state.draftText, defaultName(state.library, result.tab), { loopEnd: total - 1 })
      return openTab(state, saved)
    }
    case 'openSaved': {
      const saved = state.library.tabs.find((t) => t.id === action.id)
      return saved ? openTab(state, saved) : state
    }
    case 'deleteSaved': {
      const tabs = state.library.tabs.filter((t) => t.id !== action.id)
      const currentId = state.library.currentId === action.id ? null : state.library.currentId
      const isOpen = state.library.currentId === action.id && state.screen === 'player'
      return {
        ...state,
        library: { tabs, currentId },
        ...(isOpen ? { screen: 'home' as Screen, tab: null, editingId: null, draftText: '' } : {}),
      }
    }
    case 'renameSaved': {
      const name = action.name.trim()
      if (!name) return state
      return {
        ...state,
        library: {
          ...state.library,
          tabs: state.library.tabs.map((t) => (t.id === action.id ? { ...t, name } : t)),
        },
      }
    }
    case 'openShared': {
      const parsed = parseTab(action.payload.text)
      if (!parsed.ok) return { ...state, parseError: parsed.error }
      const duplicate = state.library.tabs.find((t) => t.text === action.payload.text)
      if (duplicate) return openTab(state, duplicate, 'Esta tablatura já estava na sua biblioteca.')
      const saved = createSavedTab(action.payload.text, defaultName(state.library, parsed.tab), {
        tuningId: action.payload.tuningId ? getTuning(action.payload.tuningId).id : 'standard',
        capo: action.payload.capo ?? 0,
        loopEnd: parsed.tab.events.length - 1,
      })
      return openTab(state, saved, 'Tablatura recebida por link e salva na sua biblioteca.')
    }
    case 'next':
      return moveIndex(state, 1)
    case 'prev':
      return moveIndex(state, -1)
    case 'setIndex':
      return setIndex(state, action.index)
    case 'setSpeed':
      return updateCurrent(state, { speed: action.speed })
    case 'setPlaying':
      return { ...state, playing: action.playing }
    case 'toggleLoop':
      return updateCurrent(state, (t) => ({ loopEnabled: !t.loopEnabled }))
    case 'setLoopStart':
      return updateCurrent(state, (t) => ({
        loopStart: state.currentIndex,
        loopEnd: Math.max(t.loopEnd, state.currentIndex),
        loopEnabled: true,
      }))
    case 'setLoopEnd':
      return updateCurrent(state, (t) => ({
        loopEnd: state.currentIndex,
        loopStart: Math.min(t.loopStart, state.currentIndex),
        loopEnabled: true,
      }))
    case 'setLoopRange':
      return setIndex(updateCurrent(state, { loopStart: action.start, loopEnd: action.end, loopEnabled: true }), action.start)
    case 'setPref':
      return { ...state, prefs: { ...state.prefs, viewPrefs: { ...state.prefs.viewPrefs, [action.key]: action.value } } }
    case 'setTabStyle':
      return { ...state, prefs: { ...state.prefs, viewPrefs: { ...state.prefs.viewPrefs, tabStyle: action.style } } }
    case 'setCountIn':
      return { ...state, prefs: { ...state.prefs, countIn: action.value } }
    case 'setTimbre':
      return { ...state, prefs: { ...state.prefs, timbre: action.timbre } }
    case 'setMetronome':
      return { ...state, prefs: { ...state.prefs, metronome: action.value } }
    case 'setDrums':
      return { ...state, prefs: { ...state.prefs, drums: action.pattern } }
    case 'setPlayRepeats':
      return { ...state, prefs: { ...state.prefs, playRepeats: action.value } }
    case 'setSpeedTrainer':
      return { ...state, prefs: { ...state.prefs, speedTrainer: { ...state.prefs.speedTrainer, ...action.patch } } }
    case 'markPracticeDay':
      return markDay(state, action.day)
    case 'recordRhythm':
      return updateCurrent(state, (t) => ({ rhythm: mergeRecorded(t.rhythm, action.recorded) }))
    case 'clearRecordedRhythm':
      return updateCurrent(state, (t) => ({ rhythm: clearRecorded(t.rhythm) }))
    case 'setTuning':
      return updateCurrent(state, { tuningId: getTuning(action.tuningId).id })
    case 'setCapo':
      return updateCurrent(state, { capo: Math.min(Math.max(Math.round(action.capo), 0), MAX_CAPO) })
    case 'setDuration':
      return updateCurrent(state, (t) => ({ rhythm: setDuration(t.rhythm, state.currentIndex, action.duration) }))
    case 'togglePause':
      return updateCurrent(state, (t) => ({ rhythm: togglePause(t.rhythm, state.currentIndex) }))
    case 'toggleHard':
      return updateCurrent(state, (t) => ({
        hardEvents: t.hardEvents.includes(state.currentIndex)
          ? t.hardEvents.filter((id) => id !== state.currentIndex)
          : [...t.hardEvents, state.currentIndex].sort((a, b) => a - b),
      }))
    case 'recordPractice':
      return updateCurrent(markDay(state), (t) => {
        const previous: PracticeRecord = t.practice[action.eventId] ?? { attempts: 0, hits: 0, lastAt: '' }
        const now = new Date().toISOString()
        return {
          practice: {
            ...t.practice,
            [action.eventId]: { attempts: previous.attempts + 1, hits: previous.hits + (action.hit ? 1 : 0), lastAt: now },
          },
          lastPracticedAt: now,
        }
      })
    case 'setStringFilter': {
      const next = { ...state, stringFilter: action.string }
      const visible = visibleIndices(next)
      if (visible.length && !visible.includes(state.currentIndex)) {
        return setIndex(next, visible.find((i) => i >= state.currentIndex) ?? visible[0])
      }
      return next
    }
    case 'dismissNotice':
      return { ...state, notice: null }
    case 'reset':
      return {
        ...state,
        screen: 'home',
        tab: null,
        draftText: '',
        editingId: null,
        parseError: null,
        playing: false,
        stringFilter: null,
        notice: null,
      }
    case 'clearAll':
      return createInitialState({ tabs: [], currentId: null }, DEFAULT_PREFS)
  }
}

export type { RhythmAnnotations }
