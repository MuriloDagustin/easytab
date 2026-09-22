import { EMPTY_RHYTHM, type RhythmAnnotations } from '../domain/rhythm'
import { DEFAULT_TIMBRE, INSTRUMENTS, type Timbre } from '../audio/instruments'
import { DRUM_PATTERNS, type DrumPattern } from '../audio/beat'
import { DEFAULT_SPEED_TRAINER, type SpeedTrainer } from '../domain/speedTrainer'

export const LIBRARY_KEY = 'tabfacil:library:v2'
export const PREFS_KEY = 'tabfacil:prefs:v2'
const LEGACY_KEY = 'tabfacil:v1'

export interface ViewPreferences {
  showLegend: boolean
  showFingers: boolean
  showPitches: boolean
  /** Tablatura desenhada (linhas e números) ou o texto original em fonte mono. */
  tabStyle: 'graphic' | 'text'
  leftHanded: boolean
  showAlternates: boolean
  showNotation: boolean
}

export interface GlobalPrefs {
  viewPrefs: ViewPreferences
  countIn: boolean
  timbre: Timbre
  metronome: boolean
  drums: DrumPattern
  playRepeats: boolean
  speedTrainer: SpeedTrainer
  /** Dias (AAAA-MM-DD) em que houve prática, para a sequência de dias. */
  practiceDays: string[]
}

export interface PracticeRecord {
  attempts: number
  hits: number
  lastAt: string
}

export interface SavedTab {
  id: string
  name: string
  text: string
  createdAt: string
  updatedAt: string
  currentIndex: number
  speed: number
  loopEnabled: boolean
  loopStart: number
  loopEnd: number
  tuningId: string
  capo: number
  rhythm: RhythmAnnotations
  hardEvents: number[]
  practice: Record<number, PracticeRecord>
  lastPracticedAt?: string
}

export interface Library {
  tabs: SavedTab[]
  currentId: string | null
}

export const DEFAULT_VIEW_PREFS: ViewPreferences = {
  showLegend: false,
  showFingers: true,
  showPitches: true,
  tabStyle: 'graphic',
  leftHanded: false,
  showAlternates: false,
  showNotation: false,
}

export const DEFAULT_PREFS: GlobalPrefs = {
  viewPrefs: DEFAULT_VIEW_PREFS,
  countIn: true,
  timbre: DEFAULT_TIMBRE,
  metronome: false,
  drums: 'off',
  playRepeats: true,
  speedTrainer: DEFAULT_SPEED_TRAINER,
  practiceDays: [],
}

export function newTabId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createSavedTab(text: string, name: string, overrides: Partial<SavedTab> = {}): SavedTab {
  const now = new Date().toISOString()
  return {
    id: newTabId(),
    name,
    text,
    createdAt: now,
    updatedAt: now,
    currentIndex: 0,
    speed: 1,
    loopEnabled: false,
    loopStart: 0,
    loopEnd: 0,
    tuningId: 'standard',
    capo: 0,
    rhythm: EMPTY_RHYTHM,
    hardEvents: [],
    practice: {},
    ...overrides,
  }
}

function sanitizeTab(raw: Partial<SavedTab>): SavedTab | null {
  if (typeof raw.text !== 'string' || !raw.text.trim() || typeof raw.id !== 'string') return null
  const base = createSavedTab(raw.text, typeof raw.name === 'string' ? raw.name : 'Tablatura')
  return {
    ...base,
    ...raw,
    id: raw.id,
    rhythm: {
      durations: raw.rhythm?.durations ?? {},
      pausesAfter: Array.isArray(raw.rhythm?.pausesAfter) ? raw.rhythm.pausesAfter : [],
      ...(raw.rhythm?.recorded && typeof raw.rhythm.recorded.baseMs === 'number'
        ? { recorded: { baseMs: raw.rhythm.recorded.baseMs, units: raw.rhythm.recorded.units ?? {} } }
        : {}),
    },
    hardEvents: Array.isArray(raw.hardEvents) ? raw.hardEvents : [],
    practice: raw.practice ?? {},
  }
}

function migrateLegacy(): Library | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const legacy = JSON.parse(raw) as Record<string, unknown>
    if (typeof legacy.tabText !== 'string' || !legacy.tabText.trim()) return null
    const tab = createSavedTab(legacy.tabText, 'Tablatura salva', {
      currentIndex: typeof legacy.currentIndex === 'number' ? legacy.currentIndex : 0,
      speed: typeof legacy.speed === 'number' ? legacy.speed : 1,
      loopEnabled: legacy.loopEnabled === true,
      loopStart: typeof legacy.loopStart === 'number' ? legacy.loopStart : 0,
      loopEnd: typeof legacy.loopEnd === 'number' ? legacy.loopEnd : 0,
    })
    const library: Library = { tabs: [tab], currentId: tab.id }
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library))
    localStorage.removeItem(LEGACY_KEY)
    return library
  } catch {
    return null
  }
}

export function loadLibrary(): Library {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY)
    if (!raw) return migrateLegacy() ?? { tabs: [], currentId: null }
    const parsed = JSON.parse(raw) as Partial<Library>
    const tabs = (Array.isArray(parsed.tabs) ? parsed.tabs : [])
      .map((t) => sanitizeTab(t))
      .filter((t): t is SavedTab => t !== null)
    const currentId = tabs.some((t) => t.id === parsed.currentId) ? (parsed.currentId as string) : null
    return { tabs, currentId }
  } catch {
    return { tabs: [], currentId: null }
  }
}

export function saveLibrary(library: Library): void {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library))
  } catch {
    // Modo privado ou cota cheia: seguir sem persistir.
  }
}

export function loadPrefs(): GlobalPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw) as Partial<GlobalPrefs>
    return {
      viewPrefs: { ...DEFAULT_VIEW_PREFS, ...(parsed.viewPrefs ?? {}) },
      countIn: parsed.countIn !== false,
      timbre: INSTRUMENTS.some((i) => i.id === parsed.timbre) ? (parsed.timbre as Timbre) : DEFAULT_TIMBRE,
      metronome: parsed.metronome === true,
      drums: DRUM_PATTERNS.some((d) => d.id === parsed.drums) ? (parsed.drums as DrumPattern) : 'off',
      playRepeats: parsed.playRepeats !== false,
      speedTrainer: { ...DEFAULT_SPEED_TRAINER, ...(parsed.speedTrainer ?? {}) },
      practiceDays: Array.isArray(parsed.practiceDays) ? parsed.practiceDays.filter((d) => typeof d === 'string') : [],
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function savePrefs(prefs: GlobalPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // ignorado
  }
}

export function clearAll(): void {
  try {
    localStorage.removeItem(LIBRARY_KEY)
    localStorage.removeItem(PREFS_KEY)
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    // ignorado
  }
}
