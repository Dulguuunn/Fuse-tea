import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { layoutDay, type Occurrence } from '@shared/calendar'
import { tasksOnDate } from '@shared/tasks'
import { clamp, formatTime, toISODate } from '@shared/time'
import type { Task, TimeFormat } from '@shared/types'
import { useTasks } from '../../state/tasksStore'
import { useUi } from '../../state/uiStore'
import { CalendarBlock } from './CalendarBlock'

const MIN_HOUR_PX = 34
const MAX_HOUR_PX = 72
const MAX_CHIPS = 3

/** Hour height that fits the visible range into the available space (scrolls below MIN_HOUR_PX). */
function useHourHeight(hours: number): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState(600)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setAvailable(el.clientHeight))
    ro.observe(el)
    setAvailable(el.clientHeight)
    return () => ro.disconnect()
  }, [])
  return [ref, clamp(Math.floor(available / hours), MIN_HOUR_PX, MAX_HOUR_PX)]
}

function useNowMinutes(): number {
  const read = (): number => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  }
  const [now, setNow] = useState(read)
  useEffect(() => {
    const t = setInterval(() => setNow(read()), 30_000)
    return () => clearInterval(t)
  }, [])
  return now
}

function TaskChips({ tasks }: { tasks: Task[] }): React.JSX.Element {
  const toggle = useTasks((s) => s.toggle)
  const setPage = useUi((s) => s.setPage)
  return (
    <>
      {tasks.slice(0, MAX_CHIPS).map((t) => (
        <button
          key={t.id}
          type="button"
          className="task-chip"
          data-done={t.done || undefined}
          role="checkbox"
          aria-checked={t.done}
          title={t.done ? `${t.title} (done) — click to re-open` : `${t.title} — click to tick off`}
          onClick={() => toggle(t.id)}
        >
          <span className="task-chip-box" />
          <span className="task-chip-label">{t.title}</span>
        </button>
      ))}
      {tasks.length > MAX_CHIPS && (
        <button type="button" className="task-chip-more" onClick={() => setPage('todos')}>
          +{tasks.length - MAX_CHIPS} more
        </button>
      )}
    </>
  )
}

export interface WeekGridProps {
  days: Date[]
  today: string
  occurrences: Occurrence[]
  range: { start: number; end: number }
  timeFormat: TimeFormat
}

export function WeekGrid({ days, today, occurrences, range, timeFormat }: WeekGridProps): React.JSX.Element {
  const tasks = useTasks((s) => s.tasks)
  const hours = (range.end - range.start) / 60
  const [scrollRef, hourPx] = useHourHeight(hours)
  const ppm = hourPx / 60
  const now = useNowMinutes()

  return (
    <div className="week" style={{ '--hour': `${hourPx}px` } as React.CSSProperties}>
      <div className="week-row week-head">
        <div className="week-gutter" />
        {days.map((d) => {
          const iso = toISODate(d)
          return (
            <div key={iso} className="day-head" data-today={iso === today || undefined}>
              <span className="day-name">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span className="day-num">{d.getDate()}</span>
            </div>
          )
        })}
      </div>

      <div className="week-row week-due">
        <div className="week-gutter week-due-label">Due</div>
        {days.map((d) => {
          const iso = toISODate(d)
          return (
            <div key={iso} className="due-cell">
              <TaskChips tasks={tasksOnDate(tasks, iso)} />
            </div>
          )
        })}
      </div>

      <div className="week-scroll" ref={scrollRef}>
        <div className="week-row week-body" style={{ height: hours * hourPx }}>
          <div className="week-gutter hour-labels">
            {Array.from({ length: hours }, (_, i) => (
              <span key={i} style={{ top: i * hourPx }}>
                {i === 0 ? '' : formatTime(range.start + i * 60, timeFormat)}
              </span>
            ))}
          </div>
          {days.map((d) => {
            const iso = toISODate(d)
            const items = layoutDay(occurrences.filter((o) => o.date === iso))
            const isToday = iso === today
            return (
              <div key={iso} className="day-col" data-today={isToday || undefined}>
                {items.map((item) => (
                  <CalendarBlock
                    key={item.key}
                    item={item}
                    top={(item.start - range.start) * ppm}
                    height={Math.max((item.end - item.start) * ppm, 16)}
                    timeFormat={timeFormat}
                  />
                ))}
                {isToday && now >= range.start && now <= range.end && (
                  <div className="now-line" style={{ top: (now - range.start) * ppm }} aria-hidden />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
