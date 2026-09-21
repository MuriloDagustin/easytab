import { useEffect, useReducer } from 'react'
import { Home } from './components/Home'
import { ImageInput } from './components/ImageInput'
import { TextInput } from './components/TextInput'
import { PlayerScreen } from './components/player/PlayerScreen'
import { EXAMPLE_TAB } from './domain/tab/fixtures'
import { decodeShare } from './share/url'
import { appReducer, createInitialState, currentSaved } from './state/appReducer'
import { clearAll, loadLibrary, loadPrefs, saveLibrary, savePrefs } from './storage/persistence'

function bootstrap() {
  const base = createInitialState(loadLibrary(), loadPrefs())
  const shared = decodeShare(window.location.hash)
  if (shared) {
    history.replaceState(null, '', window.location.pathname + window.location.search)
    return appReducer(base, { type: 'openShared', payload: shared })
  }
  return base
}

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, bootstrap)

  useEffect(() => {
    const id = setTimeout(() => saveLibrary(state.library), 300)
    return () => clearTimeout(id)
  }, [state.library])

  useEffect(() => {
    savePrefs(state.prefs)
  }, [state.prefs])

  useEffect(() => {
    function onHashChange() {
      const shared = decodeShare(window.location.hash)
      if (!shared) return
      history.replaceState(null, '', window.location.pathname + window.location.search)
      dispatch({ type: 'openShared', payload: shared })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function handleClearAll() {
    clearAll()
    dispatch({ type: 'clearAll' })
  }

  const saved = currentSaved(state)

  if (state.screen === 'player' && state.tab && saved) {
    return <PlayerScreen key={saved.id} tab={state.tab} saved={saved} state={state} dispatch={dispatch} onClearAll={handleClearAll} />
  }

  if (state.screen === 'text') {
    return (
      <TextInput
        value={state.draftText}
        onChange={(text) => dispatch({ type: 'setDraft', text })}
        onProcess={() => dispatch({ type: 'process' })}
        onBack={() => dispatch({ type: 'go', screen: state.editingId ? 'player' : 'home' })}
        onUseExample={() => dispatch({ type: 'setDraft', text: EXAMPLE_TAB })}
        error={state.parseError}
        fromImage={state.ocrSource === 'image'}
      />
    )
  }

  if (state.screen === 'image') {
    return (
      <ImageInput
        onRecognized={(text) => dispatch({ type: 'startFromImage', text })}
        onBack={() => dispatch({ type: 'go', screen: 'home' })}
      />
    )
  }

  return (
    <Home
      tabs={state.library.tabs}
      parseError={state.parseError}
      notice={state.notice}
      onPasteTab={() => dispatch({ type: 'go', screen: 'text' })}
      onUploadImage={() => dispatch({ type: 'go', screen: 'image' })}
      onTryExample={() => {
        dispatch({ type: 'setDraft', text: EXAMPLE_TAB })
        dispatch({ type: 'go', screen: 'text' })
      }}
      onOpen={(id) => dispatch({ type: 'openSaved', id })}
      onRename={(id, name) => dispatch({ type: 'renameSaved', id, name })}
      onDelete={(id) => dispatch({ type: 'deleteSaved', id })}
      onClearAll={handleClearAll}
    />
  )
}
