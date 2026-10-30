// Turn whatever was read from disk (possibly hand-edited or from an older version) into valid
// data. These never throw: bad entries are dropped, missing fields get defaults.
import { newId } from './id'
import {
  DEFAULT_COLOR,
  DEFAULT_SETTINGS,
  type CalendarData,
  type CalendarEvent,
  type ClassItem,
  type ClassSession,
  type Note,
  type Notebook,
  type Settings,
  type Task
} from './types'

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback
const bool = (v: unknown): boolean => v === true
const id = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null)
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const isMinute = (v: unknown, max = 1440): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max
const isColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

export function normalizeSettings(raw: unknown): Settings {
  const r = isObj(raw) ? raw : {}
  const s: Settings = { ...DEFAULT_SETTINGS }
  if (r.theme === 'system' || r.theme === 'light' || r.theme === 'dark') s.theme = r.theme
  if (r.weekStartsOn === 0 || r.weekStartsOn === 1) s.weekStartsOn = r.weekStartsOn
  if (r.timeFormat === '24h' || r.timeFormat === '12h') s.timeFormat = r.timeFormat
  s.sidebarCollapsed = bool(r.sidebarCollapsed)
  const start = isMinute(r.dayStart) ? r.dayStart : s.dayStart
  const end = isMinute(r.dayEnd) ? r.dayEnd : s.dayEnd
  if (start < end) {
    s.dayStart = start
    s.dayEnd = end
  }
  return s
}

export function normalizeTasks(raw: unknown): Task[] {
  return list(raw).flatMap((t): Task[] => {
    if (!isObj(t)) return []
    return [
      {
        id: id(t.id) ?? newId(),
        title: str(t.title),
        done: bool(t.done),
        dueDate: isDate(t.dueDate) ? t.dueDate : null,
        dueTime: isMinute(t.dueTime, 1439) ? t.dueTime : null,
        createdAt: num(t.createdAt, Date.now()),
        completedAt: typeof t.completedAt === 'number' ? t.completedAt : null
      }
    ]
  })
}

function normalizeSession(raw: unknown): ClassSession | null {
  if (!isObj(raw)) return null
  const { weekday, start, end } = raw
  if (typeof weekday !== 'number' || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null
  if (!isMinute(start) || !isMinute(end) || end <= start) return null
  return { id: id(raw.id) ?? newId(), weekday, start, end }
}

function normalizeClass(raw: unknown): ClassItem | null {
  if (!isObj(raw)) return null
  return {
    id: id(raw.id) ?? newId(),
    name: str(raw.name),
    room: str(raw.room),
    color: isColor(raw.color) ? raw.color : DEFAULT_COLOR,
    sessions: list(raw.sessions).flatMap((s) => normalizeSession(s) ?? [])
  }
}

function normalizeEvent(raw: unknown): CalendarEvent | null {
  if (!isObj(raw)) return null
  const { date, start, end } = raw
  if (!isDate(date) || !isMinute(start) || !isMinute(end) || end <= start) return null
  return {
    id: id(raw.id) ?? newId(),
    title: str(raw.title),
    date,
    start,
    end,
    color: isColor(raw.color) ? raw.color : DEFAULT_COLOR,
    location: str(raw.location)
  }
}

export function normalizeCalendar(raw: unknown): CalendarData {
  const r = isObj(raw) ? raw : {}
  return {
    classes: list(r.classes).flatMap((c) => normalizeClass(c) ?? []),
    events: list(r.events).flatMap((e) => normalizeEvent(e) ?? [])
  }
}

export function normalizeNote(raw: unknown): Note | null {
  if (!isObj(raw)) return null
  const noteId = id(raw.id)
  if (!noteId) return null
  const createdAt = num(raw.createdAt, Date.now())
  return {
    id: noteId,
    title: str(raw.title),
    content: isObj(raw.content) ? raw.content : null,
    text: str(raw.text),
    notebookId: id(raw.notebookId),
    pinned: bool(raw.pinned),
    createdAt,
    updatedAt: num(raw.updatedAt, createdAt),
    deletedAt: typeof raw.deletedAt === 'number' ? raw.deletedAt : null
  }
}

export function normalizeNotebooks(raw: unknown): Notebook[] {
  return list(raw).flatMap((b): Notebook[] => {
    if (!isObj(b)) return []
    const bookId = id(b.id)
    if (!bookId) return []
    return [{ id: bookId, name: str(b.name, 'Notebook'), createdAt: num(b.createdAt, Date.now()) }]
  })
}
