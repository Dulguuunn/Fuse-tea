import { useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { groupTasks } from '@shared/tasks'
import { parseISODate, parseTime, toISODate } from '@shared/time'
import type { Task } from '@shared/types'
import { useSettings } from '../../state/settingsStore'
import { useTasks } from '../../state/tasksStore'
import { useToday } from '../../useToday'
import { TaskRow } from './TaskRow'
import './todos.css'

const addDays = (iso: string, n: number): string => {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

function QuickAdd({ today }: { today: string }): React.JSX.Element {
  const add = useTasks((s) => s.add)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const tomorrow = addDays(today, 1)

  const submit = (): void => {
    if (!title.trim()) return
    add(title, date || null, date ? parseTime(time) : null)
    setTitle('')
    setDate('')
    setTime('')
  }

  const chip = (label: string, value: string): React.JSX.Element => (
    <button type="button" className="chip" aria-pressed={date === value} onClick={() => setDate(value)}>
      {label}
    </button>
  )

  return (
    <form
      className="quick-add"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="quick-add-main">
        <Plus size={18} />
        <input
          className="quick-add-input"
          value={title}
          placeholder="Add a to-do and press Enter"
          aria-label="New to-do"
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
          Add
        </button>
      </div>
      <div className="quick-add-due">
        <span className="muted">Due</span>
        {chip('No date', '')}
        {chip('Today', today)}
        {chip('Tomorrow', tomorrow)}
        <input
          className="input input-sm"
          type="date"
          value={date}
          aria-label="Due date"
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          className="input input-sm"
          type="time"
          value={time}
          aria-label="Due time"
          disabled={!date}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>
    </form>
  )
}

interface GroupProps {
  title: string
  tasks: Task[]
  today: string
  tone?: 'danger'
}

function Group({ title, tasks, today, tone }: GroupProps): React.JSX.Element | null {
  const timeFormat = useSettings((s) => s.settings.timeFormat)
  if (tasks.length === 0) return null
  return (
    <section className="task-group" data-tone={tone}>
      <h2>
        {title} <span className="muted">{tasks.length}</span>
      </h2>
      <ul>
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} today={today} timeFormat={timeFormat} />
        ))}
      </ul>
    </section>
  )
}

export function TodosPage(): React.JSX.Element {
  const tasks = useTasks((s) => s.tasks)
  const timeFormat = useSettings((s) => s.settings.timeFormat)
  const today = useToday()
  const [showDone, setShowDone] = useState(false)
  const g = groupTasks(tasks, today)
  const open = tasks.length - g.completed.length

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">To-dos</h1>
        {tasks.length > 0 && <span className="muted">{open === 0 ? 'All done' : `${open} open`}</span>}
      </header>
      <div className="page-body">
        <div className="todos">
          <QuickAdd today={today} />
          {tasks.length === 0 ? (
            <div className="empty-state todos-empty">
              <strong>Nothing to do yet</strong>
              <span>Add homework, readings or errands above. Ones with a due date also show on your calendar.</span>
            </div>
          ) : (
            <>
              <Group title="Overdue" tasks={g.overdue} today={today} tone="danger" />
              <Group title="Today" tasks={g.today} today={today} />
              <Group title="Upcoming" tasks={g.upcoming} today={today} />
              <Group title="No date" tasks={g.noDate} today={today} />
              {g.completed.length > 0 && (
                <section className="task-group task-group-done">
                  <button
                    type="button"
                    className="done-toggle"
                    aria-expanded={showDone}
                    onClick={() => setShowDone(!showDone)}
                  >
                    <ChevronRight size={16} />
                    Completed <span className="muted">{g.completed.length}</span>
                  </button>
                  {showDone && (
                    <ul>
                      {g.completed.map((t) => (
                        <TaskRow key={t.id} task={t} today={today} timeFormat={timeFormat} />
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
