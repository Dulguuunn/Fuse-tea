import { Sidebar } from './components/Sidebar'
import { NotesPage } from './features/notes/NotesPage'
import { TodosPage } from './features/todos/TodosPage'
import { CalendarPage } from './features/calendar/CalendarPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { useSettings } from './state/settingsStore'
import { useUi } from './state/uiStore'
import { useApplyTheme } from './useApplyTheme'

export default function App(): React.JSX.Element {
  const page = useUi((s) => s.page)
  const theme = useSettings((s) => s.settings.theme)
  useApplyTheme(theme)

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        {page === 'notes' && <NotesPage />}
        {page === 'todos' && <TodosPage />}
        {page === 'calendar' && <CalendarPage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
