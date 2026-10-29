import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/onest'
import '@fontsource-variable/unbounded'
import './styles/tokens.css'
import './styles/base.css'
import './styles/sidebar.css'
import App from './App'
import { saver } from './state/saver'
import { useSettings } from './state/settingsStore'

// When the window is closing, finish any pending saves first.
window.api.app.onBeforeClose(() => saver.flush())

async function start(): Promise<void> {
  try {
    await useSettings.getState().load()
  } catch (e) {
    console.error('Could not load settings', e)
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

void start()
