import type { ReactNode } from 'react'
import {
  Briefcase,
  CalendarDays,
  ListChecks,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Settings as SettingsIcon
} from 'lucide-react'
import { useSettings } from '../state/settingsStore'
import { useUi, type Page } from '../state/uiStore'

const NAV: Array<{ page: Page; label: string; icon: ReactNode }> = [
  { page: 'notes', label: 'Notes', icon: <NotebookPen size={18} /> },
  { page: 'todos', label: 'To-dos', icon: <ListChecks size={18} /> },
  { page: 'calendar', label: 'Calendar', icon: <CalendarDays size={18} /> },
  { page: 'applications', label: 'Applications', icon: <Briefcase size={18} /> }
]

/** Shrinks the sidebar to an icon strip, or expands it again (button and Ctrl+\). */
export function toggleSidebar(): void {
  const { settings, update } = useSettings.getState()
  update({ sidebarCollapsed: !settings.sidebarCollapsed })
}

function NavButton({ page, label, icon }: { page: Page; label: string; icon: ReactNode }): React.JSX.Element {
  const current = useUi((s) => s.page)
  const setPage = useUi((s) => s.setPage)
  const collapsed = useSettings((s) => s.settings.sidebarCollapsed)
  return (
    <button
      type="button"
      className="nav-item"
      aria-label={label}
      title={collapsed ? label : undefined}
      aria-current={current === page ? 'page' : undefined}
      onClick={() => setPage(page)}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

/**
 * Left column: app sections, an optional slot for page-specific navigation, Settings at the bottom.
 * Collapsed, it is a narrow strip of section icons and the slot is left out.
 */
export function Sidebar({ children }: { children?: ReactNode }): React.JSX.Element {
  const collapsed = useSettings((s) => s.settings.sidebarCollapsed)
  const toggleLabel = collapsed ? 'Show sidebar' : 'Hide sidebar'
  return (
    <aside className="sidebar" data-collapsed={collapsed || undefined}>
      <div className="sidebar-head">
        <div className="wordmark">ponder</div>
        <button
          type="button"
          className="icon-btn"
          aria-label={toggleLabel}
          title={`${toggleLabel} (Ctrl+\\)`}
          onClick={toggleSidebar}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
      <nav className="nav" aria-label="Sections">
        {NAV.map((n) => (
          <NavButton key={n.page} {...n} />
        ))}
      </nav>
      <div className="sidebar-slot">{!collapsed && children}</div>
      <nav className="nav nav-bottom" aria-label="App">
        <NavButton page="settings" label="Settings" icon={<SettingsIcon size={18} />} />
      </nav>
    </aside>
  )
}
