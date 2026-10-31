import { useCallback, useState } from 'react'
import { CalendarPlus, ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react'
import {
  CLASS_COLORS,
  occurrencesForWeek,
  visibleRange,
  weekDays,
  weekLabel,
  type Occurrence
} from '@shared/calendar'
import { slotAt, type Slot } from '@shared/calendarEdit'
import { newId } from '@shared/id'
import { formatTime, parseISODate, toISODate } from '@shared/time'
import type { CalendarEvent, ClassItem } from '@shared/types'
import { useCalendar } from '../../state/calendarStore'
import { useSettings } from '../../state/settingsStore'
import { useToday } from '../../useToday'
import { ClassDialog } from './ClassDialog'
import { EventDialog } from './EventDialog'
import { NewItemMenu } from './NewItemMenu'
import { WeekGrid } from './WeekGrid'
import './calendar.css'

type Editing =
  | { kind: 'class'; item: ClassItem; isNew: boolean }
  | { kind: 'event'; item: CalendarEvent; isNew: boolean }
  | null

interface Menu {
  x: number
  y: number
  day: Date
  slot: Slot
}

const EVENT_COLOR = '#ff9f6b'
const DEFAULT_CLASS_SLOT: Slot = { start: 9 * 60, end: 10 * 60 + 30 }
const DEFAULT_EVENT_SLOT: Slot = { start: 9 * 60, end: 10 * 60 }

/** First highlighter color no class uses yet, so each new class gets its own. */
function nextColor(classes: ClassItem[]): string {
  const used = new Set(classes.map((c) => c.color.toLowerCase()))
  return (CLASS_COLORS.find((c) => !used.has(c.value)) ?? CLASS_COLORS[classes.length % CLASS_COLORS.length]).value
}

export function CalendarPage(): React.JSX.Element {
  const data = useCalendar((s) => s.data)
  const updateSession = useCalendar((s) => s.updateSession)
  const saveEvent = useCalendar((s) => s.saveEvent)
  const settings = useSettings((s) => s.settings)
  const today = useToday()
  const [anchor, setAnchor] = useState(() => parseISODate(today))
  const [editing, setEditing] = useState<Editing>(null)
  const [menu, setMenu] = useState<Menu | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])

  const days = weekDays(anchor, settings.weekStartsOn)
  const occurrences = occurrencesForWeek(data, days)
  const range = visibleRange(settings, occurrences)
  const isThisWeek = days.some((d) => toISODate(d) === today)
  const shiftWeek = (n: number): void =>
    setAnchor(new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 7 * n))

  const newClass = (day: Date, slot: Slot): void =>
    setEditing({
      kind: 'class',
      isNew: true,
      item: {
        id: newId(),
        name: '',
        room: '',
        color: nextColor(data.classes),
        sessions: [{ id: newId(), weekday: day.getDay(), ...slot }]
      }
    })

  const newEvent = (day: Date, slot: Slot): void =>
    setEditing({
      kind: 'event',
      isNew: true,
      item: { id: newId(), title: '', date: toISODate(day), ...slot, color: EVENT_COLOR, location: '' }
    })

  const open = (occ: Occurrence): void => {
    if (occ.kind === 'class') {
      const item = data.classes.find((c) => c.id === occ.refId)
      if (item) setEditing({ kind: 'class', item, isNew: false })
    } else {
      const item = data.events.find((e) => e.id === occ.refId)
      if (item) setEditing({ kind: 'event', item, isNew: false })
    }
  }

  // Dragging a class moves that weekly slot (every week); dragging a one-off event moves just that
  // event; dragging a repeating event changes its time on every repeat (the day stays as it is).
  const move = (occ: Occurrence, dayIndex: number, slot: Slot): void => {
    const day = days[dayIndex]
    if (occ.kind === 'class') {
      const session = data.classes.find((c) => c.id === occ.refId)?.sessions.find((s) => s.id === occ.sessionId)
      if (session) updateSession(occ.refId, { ...session, weekday: day.getDay(), ...slot })
    } else {
      const event = data.events.find((e) => e.id === occ.refId)
      if (event) saveEvent({ ...event, ...(event.repeat ? {} : { date: toISODate(day) }), ...slot })
    }
  }

  const todayDate = parseISODate(today)
  const isEmpty = data.classes.length === 0 && data.events.length === 0

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
        <div className="calendar-actions">
          <button type="button" className="btn" onClick={() => newEvent(todayDate, DEFAULT_EVENT_SLOT)}>
            <CalendarPlus size={16} /> New event
          </button>
          <button type="button" className="btn btn-primary" onClick={() => newClass(todayDate, DEFAULT_CLASS_SLOT)}>
            <GraduationCap size={16} /> New class
          </button>
        </div>
      </header>
      {isEmpty && (
        <p className="calendar-hint">
          Click an empty time on the grid to add a class or an exam. Classes repeat every week; drag one to move it,
          or drag its bottom edge to change how long it is.
        </p>
      )}

      <WeekGrid
        days={days}
        today={today}
        occurrences={occurrences}
        range={range}
        timeFormat={settings.timeFormat}
        onOpen={open}
        onMove={move}
        onSlot={(dayIndex, minute, x, y) => setMenu({ x, y, day: days[dayIndex], slot: slotAt(minute) })}
      />

      {menu && (
        <NewItemMenu
          x={menu.x}
          y={menu.y}
          label={`${menu.day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at ${formatTime(menu.slot.start, settings.timeFormat)}`}
          onClose={closeMenu}
          onClass={() => {
            newClass(menu.day, menu.slot)
            setMenu(null)
          }}
          onEvent={() => {
            newEvent(menu.day, { start: menu.slot.start, end: Math.min(menu.slot.start + 60, 1440) })
            setMenu(null)
          }}
        />
      )}

      {editing?.kind === 'class' && (
        <ClassDialog
          initial={editing.item}
          isNew={editing.isNew}
          weekStartsOn={settings.weekStartsOn}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === 'event' && (
        <EventDialog
          initial={editing.item}
          isNew={editing.isNew}
          weekStartsOn={settings.weekStartsOn}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
