import { useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { Toast } from './components/Toast'
import { NotesPage } from './features/notes/NotesPage'
import { NotesSidebar } from './features/notes/NotesSidebar'
import { TodosPage } from './features/todos/TodosPage'
import { CalendarPage } from './features/calendar/CalendarPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { useNotes } from './state/notesStore'
import { useSettings } from './state/settingsStore'
import { useUi } from './state/uiStore'
import { useApplyTheme } from './useApplyTheme'

/** Ctrl+N starts a new note from anywhere in the app. */
function useGlobalShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        useUi.getState().setPage('notes')
        useNotes.getState().createNote()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export default function App(): React.JSX.Element {
  const page = useUi((s) => s.page)
  const theme = useSettings((s) => s.settings.theme)
  useApplyTheme(theme)
  useGlobalShortcuts()

  return (
    <div className="app">
      <Sidebar>
        <NotesSidebar />
      </Sidebar>
      <main className="main">
        {page === 'notes' && <NotesPage />}
        {page === 'todos' && <TodosPage />}
        {page === 'calendar' && <CalendarPage />}
        {page === 'settings' && <SettingsPage />}
      </main>
      <Toast />
    </div>
  )
}
