import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { occurrencesForWeek, visibleRange, weekDays, weekLabel } from '@shared/calendar'
import { parseISODate, toISODate } from '@shared/time'
import { useCalendar } from '../../state/calendarStore'
import { useSettings } from '../../state/settingsStore'
import { useToday } from '../../useToday'
import { WeekGrid } from './WeekGrid'
import './calendar.css'

export function CalendarPage(): React.JSX.Element {
  const data = useCalendar((s) => s.data)
  const settings = useSettings((s) => s.settings)
  const today = useToday()
  const [anchor, setAnchor] = useState(() => parseISODate(today))

  const days = weekDays(anchor, settings.weekStartsOn)
  const occurrences = occurrencesForWeek(data, days)
  const range = visibleRange(settings, occurrences)
  const isThisWeek = days.some((d) => toISODate(d) === today)
  const shiftWeek = (n: number): void =>
    setAnchor(new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 7 * n))

  return (
    <div className="calendar-page">
      <header className="page-header calendar-header">
        <h1 className="page-title">{weekLabel(days)}</h1>
        <div className="week-nav">
          <button type="button" className="icon-btn" aria-label="Previous week" onClick={() => shiftWeek(-1)}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="btn" disabled={isThisWeek} onClick={() => setAnchor(parseISODate(today))}>
            Today
          </button>
          <button type="button" className="icon-btn" aria-label="Next week" onClick={() => shiftWeek(1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      </header>
      <WeekGrid days={days} today={today} occurrences={occurrences} range={range} timeFormat={settings.timeFormat} />
    </div>
  )
}
