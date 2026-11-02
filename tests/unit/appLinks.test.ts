import { describe, expect, it } from 'vitest'
import { newApplication, type Application } from '@shared/applications'
import { reconcileTasks, syncStepsFromTasks } from '@shared/appLinks'
import type { Task } from '@shared/types'

let n = 0
const mkId = (): string => `t${++n}`

const base = (): Application => ({
  ...newApplication(1),
  id: 'app',
  name: 'Acme',
  deadline: '2026-12-01',
  steps: [
    { id: 's1', title: 'Fill form', done: false, addToTodos: true },
    { id: 's2', title: 'Submit', done: false, addToTodos: false }
  ]
})

describe('reconcileTasks', () => {
  it('creates a deadline task and a task per flagged step', () => {
    const tasks = reconcileTasks([base()], [], 100, mkId)
    expect(tasks).toHaveLength(2)
    const deadline = tasks.find((t) => t.source?.stepId === null)!
    expect(deadline).toMatchObject({ title: 'Deadline: Acme', dueDate: '2026-12-01', done: false })
    const step = tasks.find((t) => t.source?.stepId === 's1')!
    expect(step).toMatchObject({ title: 'Acme: Fill form', dueDate: '2026-12-01', done: false })
  })

  it('returns the same array when nothing changes', () => {
    const once = reconcileTasks([base()], [], 100, mkId)
    expect(reconcileTasks([base()], once, 200, mkId)).toBe(once)
  })

  it('leaves unrelated to-dos alone', () => {
    const mine: Task = { id: 'x', title: 'Buy milk', done: false, dueDate: null, dueTime: null, createdAt: 1, completedAt: null }
    const out = reconcileTasks([base()], [mine], 100, mkId)
    expect(out[0]).toBe(mine)
    expect(out).toHaveLength(3)
  })

  it('marks a step task done with a completion time, and undone again', () => {
    const a = base()
    const tasks = reconcileTasks([a], [], 100, mkId)
    a.steps[0].done = true
    const done = reconcileTasks([a], tasks, 500, mkId)
    expect(done.find((t) => t.source?.stepId === 's1')).toMatchObject({ done: true, completedAt: 500 })
    a.steps[0].done = false
    const undone = reconcileTasks([a], done, 900, mkId)
    expect(undone.find((t) => t.source?.stepId === 's1')).toMatchObject({ done: false, completedAt: null })
  })

  it('moves tasks when the deadline or name changes, and removes the deadline task without a deadline', () => {
    const a = base()
    const tasks = reconcileTasks([a], [], 1, mkId)
    a.deadline = '2026-12-15'
    a.name = 'Acme Bank'
    const moved = reconcileTasks([a], tasks, 2, mkId)
    expect(moved.map((t) => t.dueDate)).toEqual(['2026-12-15', '2026-12-15'])
    expect(moved.map((t) => t.title).sort()).toEqual(['Acme Bank: Fill form', 'Deadline: Acme Bank'])
    a.deadline = ''
    const none = reconcileTasks([a], moved, 3, mkId)
    expect(none.map((t) => t.source?.stepId)).toEqual(['s1'])
    expect(none[0].dueDate).toBeNull()
  })

  it('treats the deadline task as done once the application is submitted or finished', () => {
    const a = { ...base(), status: 'submitted' as const }
    const t = reconcileTasks([a], [], 7, mkId).find((x) => x.source?.stepId === null)!
    expect(t.done).toBe(true)
    expect(t.completedAt).toBe(7)
  })

  it('removes tasks of deleted applications, un-flagged steps and deleted steps', () => {
    const a = base()
    const tasks = reconcileTasks([a], [], 1, mkId)
    expect(reconcileTasks([], tasks, 2, mkId)).toEqual([])
    a.steps[0].addToTodos = false
    expect(reconcileTasks([a], tasks, 2, mkId).map((t) => t.source?.stepId)).toEqual([null])
    a.steps = []
    expect(reconcileTasks([a], tasks, 2, mkId).map((t) => t.source?.stepId)).toEqual([null])
  })
})

describe('syncStepsFromTasks', () => {
  it('checking the to-do ticks the step', () => {
    const a = base()
    const tasks = reconcileTasks([a], [], 1, mkId).map((t) =>
      t.source?.stepId === 's1' ? { ...t, done: true, completedAt: 9 } : t
    )
    const out = syncStepsFromTasks([a], tasks)
    expect(out[0].steps[0].done).toBe(true)
    expect(out[0].steps[1].done).toBe(false)
  })

  it('a deleted to-do un-links its step', () => {
    const a = base()
    const tasks = reconcileTasks([a], [], 1, mkId).filter((t) => t.source?.stepId !== 's1')
    const out = syncStepsFromTasks([a], tasks)
    expect(out[0].steps[0].addToTodos).toBe(false)
  })

  it('returns the same array when nothing changes', () => {
    const a = base()
    const tasks = reconcileTasks([a], [], 1, mkId)
    const apps = [a]
    expect(syncStepsFromTasks(apps, tasks)).toBe(apps)
  })

  it('ticking a step in the app and then syncing both ways settles', () => {
    let apps = [base()]
    let tasks = reconcileTasks(apps, [], 1, mkId)
    apps = [{ ...apps[0], steps: apps[0].steps.map((s) => (s.id === 's1' ? { ...s, done: true } : s)) }]
    tasks = reconcileTasks(apps, tasks, 2, mkId)
    expect(syncStepsFromTasks(apps, tasks)).toBe(apps)
    expect(tasks.find((t) => t.source?.stepId === 's1')!.done).toBe(true)
  })
})
