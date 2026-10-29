import { parseISODate } from './time'
import type { Task } from './types'

export interface TaskGroups {
  overdue: Task[]
  today: Task[]
  upcoming: Task[]
  noDate: Task[]
  completed: Task[]
}

/** Earlier date first; on the same day timed tasks come first (by time); then oldest created. */
function byDue(a: Task, b: Task): number {
  if (a.dueDate !== b.dueDate) return (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
  if (a.dueTime !== b.dueTime) {
    if (a.dueTime === null) return 1
    if (b.dueTime === null) return -1
    return a.dueTime - b.dueTime
  }
  return a.createdAt - b.createdAt
}

export function groupTasks(tasks: Task[], today: string): TaskGroups {
  const g: TaskGroups = { overdue: [], today: [], upcoming: [], noDate: [], completed: [] }
  for (const t of tasks) {
    if (t.done) g.completed.push(t)
    else if (t.dueDate === null) g.noDate.push(t)
    else if (t.dueDate < today) g.overdue.push(t)
    else if (t.dueDate === today) g.today.push(t)
    else g.upcoming.push(t)
  }
  g.overdue.sort(byDue)
  g.today.sort(byDue)
  g.upcoming.sort(byDue)
  g.noDate.sort(byDue)
  g.completed.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
  return g
}

export function tasksOnDate(tasks: Task[], date: string): Task[] {
  return tasks.filter((t) => t.dueDate === date).sort(byDue)
}

export function toggleTask(task: Task, now: number): Task {
  return task.done ? { ...task, done: false, completedAt: null } : { ...task, done: true, completedAt: now }
}

/** "Today", "Tomorrow", "Yesterday", "Fri, Nov 6", "Mon, Jan 4, 2027". */
export function formatDue(date: string, today: string): string {
  const d = parseISODate(date)
  const days = Math.round((d.getTime() - parseISODate(today).getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  const sameYear = date.slice(0, 4) === today.slice(0, 4)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' })
  })
}
