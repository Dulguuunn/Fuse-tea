import { toISODate } from './time'
import type { CalendarData, Settings } from './types'

/** Highlighter colors for classes and events. Text on them is always dark ink. */
export const CLASS_COLORS: Array<{ name: string; value: string }> = [
  { name: 'Yellow', value: '#ffd84d' },
  { name: 'Blue', value: '#7cc4ff' },
  { name: 'Pink', value: '#ff9ec4' },
  { name: 'Green', value: '#7ee0a1' },
  { name: 'Orange', value: '#ff9f6b' },
  { name: 'Purple', value: '#c4a5ff' },
  { name: 'Teal', value: '#5fd4cf' },
  { name: 'Red', value: '#ff8a80' }
]

/** The 7 days (local midnights) of the week containing `anchor`. */
export function weekDays(anchor: Date, weekStartsOn: 0 | 1): Date[] {
  const offset = (anchor.getDay() - weekStartsOn + 7) % 7
  const first = anchor.getDate() - offset
  return Array.from({ length: 7 }, (_, i) => new Date(anchor.getFullYear(), anchor.getMonth(), first + i))
}

/** "Oct 5 – 11, 2026", "Oct 26 – Nov 1, 2026", "Dec 28, 2026 – Jan 3, 2027". */
export function weekLabel(days: Date[]): string {
  const a = days[0]
  const b = days[days.length - 1]
  const month = (d: Date): string => d.toLocaleDateString('en-US', { month: 'short' })
  if (a.getFullYear() !== b.getFullYear()) {
    return `${month(a)} ${a.getDate()}, ${a.getFullYear()} – ${month(b)} ${b.getDate()}, ${b.getFullYear()}`
  }
  if (a.getMonth() !== b.getMonth()) {
    return `${month(a)} ${a.getDate()} – ${month(b)} ${b.getDate()}, ${b.getFullYear()}`
  }
  return `${month(a)} ${a.getDate()} – ${b.getDate()}, ${b.getFullYear()}`
}

/** One block on the calendar: a weekly class slot on a specific date, or a one-off event. */
export interface Occurrence {
  key: string
  kind: 'class' | 'event'
  refId: string
  sessionId: string | null
  title: string
  subtitle: string
  color: string
  date: string
  start: number
  end: number
}

export function occurrencesForWeek(data: CalendarData, days: Date[]): Occurrence[] {
  const out: Occurrence[] = []
  for (const day of days) {
    const date = toISODate(day)
    for (const c of data.classes) {
      for (const s of c.sessions) {
        if (s.weekday !== day.getDay()) continue
        out.push({
          key: `c:${c.id}:${s.id}:${date}`,
          kind: 'class',
          refId: c.id,
          sessionId: s.id,
          title: c.name,
          subtitle: c.room,
          color: c.color,
          date,
          start: s.start,
          end: s.end
        })
      }
    }
    for (const e of data.events) {
      if (e.date !== date) continue
      out.push({
        key: `e:${e.id}`,
        kind: 'event',
        refId: e.id,
        sessionId: null,
        title: e.title,
        subtitle: e.location,
        color: e.color,
        date,
        start: e.start,
        end: e.end
      })
    }
  }
  return out
}

export type LaidOut = Occurrence & { col: number; cols: number }

/** Side-by-side columns for overlapping blocks within one day. */
export function layoutDay(items: Occurrence[]): LaidOut[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end)
  const out: LaidOut[] = []
  let cluster: Array<{ item: Occurrence; col: number }> = []
  let columnEnds: number[] = []
  let clusterEnd = -1

  const flush = (): void => {
    for (const c of cluster) out.push({ ...c.item, col: c.col, cols: columnEnds.length })
    cluster = []
    columnEnds = []
    clusterEnd = -1
  }

  for (const item of sorted) {
    if (cluster.length > 0 && item.start >= clusterEnd) flush()
    let col = columnEnds.findIndex((end) => end <= item.start)
    if (col === -1) {
      col = columnEnds.length
      columnEnds.push(item.end)
    } else {
      columnEnds[col] = item.end
    }
    cluster.push({ item, col })
    clusterEnd = Math.max(clusterEnd, item.end)
  }
  flush()
  return out
}

/** Hours shown on the grid: the settings range, widened to whole hours so no block is hidden. */
export function visibleRange(settings: Settings, items: Occurrence[]): { start: number; end: number } {
  let start = settings.dayStart
  let end = settings.dayEnd
  for (const o of items) {
    start = Math.min(start, Math.floor(o.start / 60) * 60)
    end = Math.max(end, Math.ceil(o.end / 60) * 60)
  }
  return { start, end }
}
