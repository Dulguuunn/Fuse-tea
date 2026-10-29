import { describe, expect, it } from 'vitest'
import { formatDue, groupTasks, insertTaskAt, removeTask, tasksOnDate, toggleTask } from '@shared/tasks'
import type { Task } from '@shared/types'

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: id,
  done: false,
  dueDate: null,
  dueTime: null,
  createdAt: 0,
  completedAt: null,
  ...over
})
const ids = (list: Task[]): string[] => list.map((t) => t.id)
const TODAY = '2026-10-29'

describe('groupTasks', () => {
  it('puts an open task from yesterday under overdue', () => {
    expect(ids(groupTasks([task('a', { dueDate: '2026-10-28' })], TODAY).overdue)).toEqual(['a'])
  })

  it('puts a finished task under completed, never overdue', () => {
    const g = groupTasks([task('a', { dueDate: '2026-10-20', done: true, completedAt: 5 })], TODAY)
    expect(g.overdue).toEqual([])
    expect(ids(g.completed)).toEqual(['a'])
  })

  it('orders same-day tasks: timed ones first by time, then untimed by creation', () => {
    const g = groupTasks(
      [
        task('untimed-late', { dueDate: TODAY, createdAt: 2 }),
        task('at-17', { dueDate: TODAY, dueTime: 1020 }),
        task('untimed-early', { dueDate: TODAY, createdAt: 1 }),
        task('at-9', { dueDate: TODAY, dueTime: 540 })
      ],
      TODAY
    )
    expect(ids(g.today)).toEqual(['at-9', 'at-17', 'untimed-early', 'untimed-late'])
  })

  it('orders upcoming by date, and keeps undated tasks in creation order', () => {
    const g = groupTasks(
      [
        task('nov-5', { dueDate: '2026-11-05' }),
        task('oct-30', { dueDate: '2026-10-30' }),
        task('second', { createdAt: 2 }),
        task('first', { createdAt: 1 })
      ],
      TODAY
    )
    expect(ids(g.upcoming)).toEqual(['oct-30', 'nov-5'])
    expect(ids(g.noDate)).toEqual(['first', 'second'])
  })

  it('lists completed tasks newest first', () => {
    const g = groupTasks(
      [task('old', { done: true, completedAt: 1 }), task('new', { done: true, completedAt: 9 })],
      TODAY
    )
    expect(ids(g.completed)).toEqual(['new', 'old'])
  })
})

describe('toggleTask', () => {
  it('marks done with a completion time', () => {
    expect(toggleTask(task('a'), 42)).toMatchObject({ done: true, completedAt: 42 })
  })
  it('re-opens and clears the completion time', () => {
    expect(toggleTask(task('a', { done: true, completedAt: 42 }), 50)).toMatchObject({ done: false, completedAt: null })
  })
})

describe('tasksOnDate', () => {
  it('returns open and finished tasks due that day, timed first', () => {
    const list = [
      task('other-day', { dueDate: '2026-10-30' }),
      task('done', { dueDate: TODAY, done: true }),
      task('timed', { dueDate: TODAY, dueTime: 600 })
    ]
    expect(ids(tasksOnDate(list, TODAY))).toEqual(['timed', 'done'])
  })
})

describe('formatDue', () => {
  it('uses relative words near today', () => {
    expect(formatDue('2026-10-29', TODAY)).toBe('Today')
    expect(formatDue('2026-10-30', TODAY)).toBe('Tomorrow')
    expect(formatDue('2026-10-28', TODAY)).toBe('Yesterday')
  })
  it('shows weekday and date otherwise', () => {
    expect(formatDue('2026-11-06', TODAY)).toBe('Fri, Nov 6')
  })
  it('adds the year when it is not this year', () => {
    expect(formatDue('2027-01-04', TODAY)).toBe('Mon, Jan 4, 2027')
  })
})

describe('removeTask / insertTaskAt (undo)', () => {
  const list = [task('a'), task('b'), task('c')]

  it('returns the removed task and where it was, keeping the rest in order', () => {
    const r = removeTask(list, 'b')
    expect(r.removed?.id).toBe('b')
    expect(r.index).toBe(1)
    expect(ids(r.tasks)).toEqual(['a', 'c'])
  })
  it('does nothing for an unknown id', () => {
    const r = removeTask(list, 'zzz')
    expect(r.removed).toBeNull()
    expect(ids(r.tasks)).toEqual(['a', 'b', 'c'])
  })
  it('puts a task back at the same place', () => {
    const r = removeTask(list, 'b')
    expect(ids(insertTaskAt(r.tasks, r.removed!, r.index))).toEqual(['a', 'b', 'c'])
  })
  it('puts it at the end if the list got shorter meanwhile', () => {
    expect(ids(insertTaskAt([task('a')], task('z'), 5))).toEqual(['a', 'z'])
  })
  it('does not duplicate a task that is already back', () => {
    expect(ids(insertTaskAt(list, task('b'), 1))).toEqual(['a', 'b', 'c'])
  })
})
