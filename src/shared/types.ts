// Data models saved in the data folder. Times are minutes since midnight, weekdays use
// JS numbering (0 = Sunday … 6 = Saturday), dates are local 'YYYY-MM-DD' strings.

export interface Note {
  id: string
  title: string
  /** TipTap document JSON; null for a brand-new empty note. */
  content: unknown
  /** Plain-text copy of the content, used for search and previews. */
  text: string
  notebookId: string | null
  pinned: boolean
  createdAt: number
  updatedAt: number
  /** Set when the note is in the Trash. */
  deletedAt: number | null
}

export interface Notebook {
  id: string
  name: string
  createdAt: number
}

export interface Task {
  id: string
  title: string
  done: boolean
  dueDate: string | null
  dueTime: number | null
  createdAt: number
  completedAt: number | null
}

export interface ClassSession {
  id: string
  weekday: number
  start: number
  end: number
}

export interface ClassItem {
  id: string
  name: string
  room: string
  color: string
  sessions: ClassSession[]
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  start: number
  end: number
  color: string
  location: string
}

export interface CalendarData {
  classes: ClassItem[]
  events: CalendarEvent[]
}

export type Theme = 'system' | 'light' | 'dark'
export type TimeFormat = '24h' | '12h'

export interface Settings {
  theme: Theme
  /** First hour shown on the calendar, in minutes (420 = 07:00). */
  dayStart: number
  /** Last hour shown on the calendar, in minutes (1320 = 22:00). */
  dayEnd: number
  weekStartsOn: 0 | 1
  timeFormat: TimeFormat
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  dayStart: 420,
  dayEnd: 1320,
  weekStartsOn: 1,
  timeFormat: '24h'
}

export const DEFAULT_COLOR = '#7cc4ff'
