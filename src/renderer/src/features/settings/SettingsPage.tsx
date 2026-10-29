import { useEffect, useState, type ReactNode } from 'react'
import { FolderOpen } from 'lucide-react'
import { formatTime } from '@shared/time'
import type { Theme, TimeFormat } from '@shared/types'
import { Segmented } from '../../components/Segmented'
import { useSettings } from '../../state/settingsStore'
import './settings.css'

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }): React.JSX.Element {
  return (
    <div className="settings-row">
      <div className="settings-label">
        <span>{title}</span>
        {hint && <span className="muted">{hint}</span>}
      </div>
      <div className="settings-control">{children}</div>
    </div>
  )
}

export function SettingsPage(): React.JSX.Element {
  const { settings, update } = useSettings()
  const [dataDir, setDataDir] = useState('')
  const [version, setVersion] = useState('')

  useEffect(() => {
    void window.api.app.dataDir().then(setDataDir)
    void window.api.app.version().then(setVersion)
  }, [])

  const hourLabel = (h: number): string => formatTime(h * 60, settings.timeFormat)
  const startHour = settings.dayStart / 60
  const endHour = settings.dayEnd / 60

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
      </header>
      <div className="page-body">
        <div className="settings">
          <section>
            <h2>Look</h2>
            <Row title="Theme" hint="System follows your Windows light or dark mode.">
              <Segmented<Theme>
                label="Theme"
                value={settings.theme}
                onChange={(theme) => update({ theme })}
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' }
                ]}
              />
            </Row>
            <Row title="Time format">
              <Segmented<TimeFormat>
                label="Time format"
                value={settings.timeFormat}
                onChange={(timeFormat) => update({ timeFormat })}
                options={[
                  { value: '24h', label: '24-hour (13:30)' },
                  { value: '12h', label: '12-hour (1:30 PM)' }
                ]}
              />
            </Row>
          </section>

          <section>
            <h2>Calendar</h2>
            <Row title="Week starts on">
              <Segmented<0 | 1>
                label="Week starts on"
                value={settings.weekStartsOn}
                onChange={(weekStartsOn) => update({ weekStartsOn })}
                options={[
                  { value: 1, label: 'Monday' },
                  { value: 0, label: 'Sunday' }
                ]}
              />
            </Row>
            <Row title="Hours shown" hint="Classes outside these hours still appear; the grid stretches to fit them.">
              <div className="hour-range">
                <select
                  className="select"
                  aria-label="First hour"
                  value={startHour}
                  onChange={(e) => update({ dayStart: Number(e.target.value) * 60 })}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h} disabled={h >= endHour}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
                <span className="muted">to</span>
                <select
                  className="select"
                  aria-label="Last hour"
                  value={endHour}
                  onChange={(e) => update({ dayEnd: Number(e.target.value) * 60 })}
                >
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h} disabled={h <= startHour}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
              </div>
            </Row>
          </section>

          <section>
            <h2>Your data</h2>
            <Row
              title="Data folder"
              hint="Notes, to-dos, classes and pasted images are saved here as files. A backup copy is made every day in its backups folder (the last 7 days are kept)."
            >
              <div className="data-folder">
                <code title={dataDir}>{dataDir}</code>
                <button type="button" className="btn" onClick={() => void window.api.app.openDataFolder()}>
                  <FolderOpen size={15} /> Open data folder
                </button>
              </div>
            </Row>
          </section>

          <p className="settings-footer muted">Notes {version}</p>
        </div>
      </div>
    </>
  )
}
