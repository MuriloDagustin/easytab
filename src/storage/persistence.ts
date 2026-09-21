export const STORAGE_KEY = 'tabfacil:v1'

export interface ViewPreferences {
  showLegend: boolean
  showFingers: boolean
  showPitches: boolean
}

export interface PersistedState {
  version: 1
  tabText: string
  speed: number
  currentIndex: number
  loopEnabled: boolean
  loopStart: number
  loopEnd: number
  viewPrefs: ViewPreferences
  savedAt: string
}

export const DEFAULT_VIEW_PREFS: ViewPreferences = {
  showLegend: false,
  showFingers: true,
  showPitches: true,
}

export function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    if (parsed.version !== 1 || typeof parsed.tabText !== 'string' || !parsed.tabText.trim()) return null
    return {
      version: 1,
      tabText: parsed.tabText,
      speed: typeof parsed.speed === 'number' ? parsed.speed : 1,
      currentIndex: typeof parsed.currentIndex === 'number' ? parsed.currentIndex : 0,
      loopEnabled: parsed.loopEnabled === true,
      loopStart: typeof parsed.loopStart === 'number' ? parsed.loopStart : 0,
      loopEnd: typeof parsed.loopEnd === 'number' ? parsed.loopEnd : 0,
      viewPrefs: { ...DEFAULT_VIEW_PREFS, ...(parsed.viewPrefs ?? {}) },
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function saveState(state: Omit<PersistedState, 'version' | 'savedAt'>): void {
  try {
    const payload: PersistedState = { version: 1, ...state, savedAt: new Date().toISOString() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Modo privado ou cota cheia: seguir sem persistir.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignorado
  }
}
