import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/onest'
import '@fontsource-variable/unbounded'
import './styles/tokens.css'
import './styles/base.css'
import './styles/sidebar.css'
import App from './App'
import { LockScreen } from './components/LockScreen'
import { useCalendar } from './state/calendarStore'
import { saver } from './state/saver'
import { useNotes } from './state/notesStore'
import { useSettings } from './state/settingsStore'
import { useTasks } from './state/tasksStore'

// When the window is closing, finish any pending saves first.
window.api.app.onBeforeClose(() => saver.flush())

/** Load every store before the first render; one failing store doesn't block the others. */
async function loadAll(): Promise<void> {
  const loaders: Array<[string, () => Promise<void>]> = [
    ['settings', () => useSettings.getState().load()],
    ['notes', () => useNotes.getState().load()],
    ['tasks', () => useTasks.getState().load()],
    ['calendar', () => useCalendar.getState().load()]
  ]
  await Promise.all(
    loaders.map(([name, load]) => load().catch((e: unknown) => console.error(`Could not load ${name}`, e)))
  )
}

function renderApp(root: ReturnType<typeof createRoot>): void {
  void loadAll().then(() =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  )
}

async function start(): Promise<void> {
  const root = createRoot(document.getElementById('root')!)
  const lock = await window.api.lock.status()
  if (lock.unlocked) renderApp(root)
  else root.render(<LockScreen theme={lock.theme} onUnlocked={() => renderApp(root)} />)
}

void start()
