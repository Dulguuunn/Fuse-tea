import type { ReactNode } from 'react'
import { CalendarDays, ListChecks, NotebookPen, Settings as SettingsIcon } from 'lucide-react'
import { useUi, type Page } from '../state/uiStore'

const NAV: Array<{ page: Page; label: string; icon: ReactNode }> = [
  { page: 'notes', label: 'Notes', icon: <NotebookPen size={18} /> },
  { page: 'todos', label: 'To-dos', icon: <ListChecks size={18} /> },
  { page: 'calendar', label: 'Calendar', icon: <CalendarDays size={18} /> }
]

function NavButton({ page, label, icon }: { page: Page; label: string; icon: ReactNode }): React.JSX.Element {
  const current = useUi((s) => s.page)
  const setPage = useUi((s) => s.setPage)
  return (
    <button
      type="button"
      className="nav-item"
      aria-current={current === page ? 'page' : undefined}
      onClick={() => setPage(page)}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

/** Left column: app sections, an optional slot for page-specific navigation, Settings at the bottom. */
export function Sidebar({ children }: { children?: ReactNode }): React.JSX.Element {
  return (
    <aside className="sidebar">
      <div className="wordmark">notes</div>
      <nav className="nav" aria-label="Sections">
        {NAV.map((n) => (
          <NavButton key={n.page} {...n} />
        ))}
      </nav>
      <div className="sidebar-slot">{children}</div>
      <nav className="nav nav-bottom" aria-label="App">
        <NavButton page="settings" label="Settings" icon={<SettingsIcon size={18} />} />
      </nav>
    </aside>
  )
}
