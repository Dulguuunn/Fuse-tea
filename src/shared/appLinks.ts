// Keeps applications and to-dos in step. Each application with a deadline has one linked to-do
// (Task.source.stepId === null); each step marked "add to to-dos" has one more. Titles and due dates of the
// linked to-dos follow the application; "done" goes both ways.
import { isSubmittedOrLater, type Application } from './applications'
import { newId } from './id'
import type { Task } from './types'

interface Wanted {
  applicationId: string
  stepId: string | null
  title: string
  dueDate: string | null
  done: boolean
}

const keyOf = (applicationId: string, stepId: string | null): string => `${applicationId}\u0000${stepId ?? ''}`

function wantedTasks(apps: Application[]): Wanted[] {
  const out: Wanted[] = []
  for (const a of apps) {
    const name = a.name.trim() || 'Untitled application'
    if (a.deadline) {
      out.push({
        applicationId: a.id,
        stepId: null,
        title: `Deadline: ${name}`,
        dueDate: a.deadline,
        done: isSubmittedOrLater(a.status)
      })
    }
    for (const s of a.steps) {
      if (s.addToTodos) {
        out.push({
          applicationId: a.id,
          stepId: s.id,
          title: `${name}: ${s.title}`,
          dueDate: a.deadline || null,
          done: s.done
        })
      }
    }
  }
  return out
}

/**
 * Applications → to-dos: creates, updates and removes the linked to-dos. To-dos without a `source` are untouched.
 * Returns the same array when nothing needs to change.
 */
export function reconcileTasks(apps: Application[], tasks: Task[], now: number, makeId: () => string = newId): Task[] {
  const wanted = new Map(wantedTasks(apps).map((w) => [keyOf(w.applicationId, w.stepId), w]))
  let changed = false
  const out: Task[] = []
  const seen = new Set<string>()
  for (const t of tasks) {
    if (!t.source) {
      out.push(t)
      continue
    }
    const k = keyOf(t.source.applicationId, t.source.stepId)
    const w = wanted.get(k)
    if (!w || seen.has(k)) {
      changed = true // no longer wanted (or a duplicate)
      continue
    }
    seen.add(k)
    if (t.title === w.title && t.dueDate === w.dueDate && t.done === w.done && (w.dueDate !== null || t.dueTime === null)) {
      out.push(t)
      continue
    }
    changed = true
    out.push({
      ...t,
      title: w.title,
      dueDate: w.dueDate,
      dueTime: w.dueDate ? t.dueTime : null,
      done: w.done,
      completedAt: w.done ? (t.done ? t.completedAt : now) : null
    })
  }
  for (const [k, w] of wanted) {
    if (seen.has(k)) continue
    changed = true
    out.push({
      id: makeId(),
      title: w.title,
      done: w.done,
      dueDate: w.dueDate,
      dueTime: null,
      createdAt: now,
      completedAt: w.done ? now : null,
      source: { applicationId: w.applicationId, stepId: w.stepId }
    })
  }
  return changed ? out : tasks
}

/**
 * To-dos → applications: a ticked linked to-do ticks its step; a linked to-do that was deleted un-links its step.
 * Returns the same array when nothing needs to change.
 */
export function syncStepsFromTasks(apps: Application[], tasks: Task[]): Application[] {
  const byKey = new Map<string, Task>()
  for (const t of tasks) if (t.source?.stepId) byKey.set(keyOf(t.source.applicationId, t.source.stepId), t)
  let changed = false
  const out = apps.map((a) => {
    let stepsChanged = false
    const steps = a.steps.map((s) => {
      if (!s.addToTodos) return s
      const t = byKey.get(keyOf(a.id, s.id))
      if (!t) {
        stepsChanged = true
        return { ...s, addToTodos: false }
      }
      if (t.done === s.done) return s
      stepsChanged = true
      return { ...s, done: t.done }
    })
    if (!stepsChanged) return a
    changed = true
    return { ...a, steps }
  })
  return changed ? out : apps
}
