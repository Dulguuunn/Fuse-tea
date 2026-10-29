import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/onest'
import '@fontsource-variable/unbounded'
import './styles/tokens.css'
import './styles/base.css'
import './styles/sidebar.css'
import App from './App'
import { saver } from './state/saver'
import { useNotes } from './state/notesStore'
import { useSettings } from './state/settingsStore'

// When the window is closing, finish any pending saves first.
window.api.app.onBeforeClose(() => saver.flush())

/** Load every store before the first render; one failing store doesn't block the others. */
async function loadAll(): Promise<void> {
  const loaders: Array<[string, () => Promise<void>]> = [
    ['settings', () => useSettings.getState().load()],
    ['notes', () => useNotes.getState().load()]
  ]
  await Promise.all(
    loaders.map(([name, load]) => load().catch((e: unknown) => console.error(`Could not load ${name}`, e)))
  )
}

async function start(): Promise<void> {
  await loadAll()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

void start()
