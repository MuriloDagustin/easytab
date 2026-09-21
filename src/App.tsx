import { useEffect, useReducer, useState } from 'react'
import { Home } from './components/Home'
import { ImageInput } from './components/ImageInput'
import { TextInput } from './components/TextInput'
import { PlayerScreen } from './components/player/PlayerScreen'
import { EXAMPLE_TAB } from './domain/tab/fixtures'
import { appReducer, initialState } from './state/appReducer'
import { clearState, loadState, saveState } from './storage/persistence'

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const [saved, setSaved] = useState(() => loadState())

  useEffect(() => {
    if (!state.tab || !state.tabText) return
    const id = setTimeout(() => {
      saveState({
        tabText: state.tabText,
        speed: state.speed,
        currentIndex: state.currentIndex,
        loopEnabled: state.loopEnabled,
        loopStart: state.loopStart,
        loopEnd: state.loopEnd,
        viewPrefs: state.viewPrefs,
      })
    }, 350)
    return () => clearTimeout(id)
  }, [
    state.tab,
    state.tabText,
    state.speed,
    state.currentIndex,
    state.loopEnabled,
    state.loopStart,
    state.loopEnd,
    state.viewPrefs,
  ])

  function handleClearSaved() {
    clearState()
    setSaved(null)
    dispatch({ type: 'clearSaved' })
  }

  if (state.screen === 'player' && state.tab) {
    return (
      <PlayerScreen
        tab={state.tab}
        currentIndex={state.currentIndex}
        speed={state.speed}
        playing={state.playing}
        loopEnabled={state.loopEnabled}
        loopStart={state.loopStart}
        loopEnd={state.loopEnd}
        viewPrefs={state.viewPrefs}
        onSelect={(index) => dispatch({ type: 'setIndex', index })}
        onPrev={() => dispatch({ type: 'prev' })}
        onNext={() => dispatch({ type: 'next' })}
        onSpeed={(speed) => dispatch({ type: 'setSpeed', speed })}
        onPlaying={(playing) => dispatch({ type: 'setPlaying', playing })}
        onToggleLoop={() => dispatch({ type: 'toggleLoop' })}
        onSetLoopStart={() => dispatch({ type: 'setLoopStart' })}
        onSetLoopEnd={() => dispatch({ type: 'setLoopEnd' })}
        onPref={(key, value) => dispatch({ type: 'setPref', key, value })}
        onEdit={() => dispatch({ type: 'go', screen: 'text' })}
        onNewTab={() => dispatch({ type: 'reset' })}
        onClearSaved={handleClearSaved}
      />
    )
  }

  if (state.screen === 'text') {
    return (
      <TextInput
        value={state.draftText}
        onChange={(text) => dispatch({ type: 'setDraft', text })}
        onProcess={() => dispatch({ type: 'process' })}
        onBack={() => dispatch({ type: 'go', screen: 'home' })}
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
      onPasteTab={() => dispatch({ type: 'go', screen: 'text' })}
      onUploadImage={() => dispatch({ type: 'go', screen: 'image' })}
      onTryExample={() => {
        dispatch({ type: 'setDraft', text: EXAMPLE_TAB })
        dispatch({ type: 'go', screen: 'text' })
      }}
      hasSavedSession={saved !== null}
      onContinue={() => saved && dispatch({ type: 'restore', persisted: saved })}
      onClearSaved={handleClearSaved}
    />
  )
}
