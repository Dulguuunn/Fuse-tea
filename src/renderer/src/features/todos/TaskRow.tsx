import { useRef, useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { formatDue } from '@shared/tasks'
import { formatTime, parseTime, toTimeInput } from '@shared/time'
import type { Task, TimeFormat } from '@shared/types'
import { useTasks } from '../../state/tasksStore'

export function TaskCheck({ task }: { task: Task }): React.JSX.Element {
  const toggle = useTasks((s) => s.toggle)
  return (
    <button
      type="button"
      className="task-check"
      role="checkbox"
      aria-checked={task.done}
      aria-label={task.done ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
      onClick={() => toggle(task.id)}
    >
      <Check size={13} strokeWidth={3} />
    </button>
  )
}

export function dueLabel(task: Task, today: string, fmt: TimeFormat): string {
  if (!task.dueDate) return ''
  const day = formatDue(task.dueDate, today)
  return task.dueTime === null ? day : `${day}, ${formatTime(task.dueTime, fmt)}`
}

function TaskEdit({ task, onDone }: { task: Task; onDone(): void }): React.JSX.Element {
  const update = useTasks((s) => s.update)
  const [title, setTitle] = useState(task.title)
  const [date, setDate] = useState(task.dueDate ?? '')
  const [time, setTime] = useState(task.dueTime === null ? '' : toTimeInput(task.dueTime))
  const wrap = useRef<HTMLFormElement>(null)

  const save = (): void => {
    update(task.id, { title, dueDate: date || null, dueTime: date ? parseTime(time) : null })
    onDone()
  }

  return (
    <form
      ref={wrap}
      className="task-edit"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
      onKeyDown={(e) => e.key === 'Escape' && onDone()}
      onBlur={(e) => {
        if (!wrap.current?.contains(e.relatedTarget as Node | null)) save()
      }}
    >
      <input className="input task-edit-title" autoFocus value={title} aria-label="To-do" onChange={(e) => setTitle(e.target.value)} />
      <input className="input" type="date" value={date} aria-label="Due date" onChange={(e) => setDate(e.target.value)} />
      <input
        className="input"
        type="time"
        value={time}
        aria-label="Due time"
        disabled={!date}
        onChange={(e) => setTime(e.target.value)}
      />
      <button type="submit" className="btn btn-primary">
        Done
      </button>
    </form>
  )
}

interface TaskRowProps {
  task: Task
  today: string
  timeFormat: TimeFormat
}

export function TaskRow({ task, today, timeFormat }: TaskRowProps): React.JSX.Element {
  const remove = useTasks((s) => s.remove)
  const [editing, setEditing] = useState(false)
  const overdue = !task.done && task.dueDate !== null && task.dueDate < today

  return (
    <li className="task-row" data-done={task.done || undefined}>
      <TaskCheck task={task} />
      {editing ? (
        <TaskEdit task={task} onDone={() => setEditing(false)} />
      ) : (
        <>
          <button type="button" className="task-title" onClick={() => setEditing(true)} title="Click to edit">
            {task.title}
          </button>
          {task.dueDate && (
            <span className="task-due" data-overdue={overdue || undefined}>
              {dueLabel(task, today, timeFormat)}
            </span>
          )}
          <button
            type="button"
            className="icon-btn task-delete"
            aria-label={`Delete “${task.title}”`}
            title="Delete"
            onClick={() => remove(task.id)}
          >
            <Trash2 size={15} />
          </button>
        </>
      )}
    </li>
  )
}
