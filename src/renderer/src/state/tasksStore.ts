import { create } from 'zustand'
import { newId } from '@shared/id'
import { insertTaskAt, removeTask, toggleTask } from '@shared/tasks'
import type { Task } from '@shared/types'
import { saver } from './saver'

export type TaskPatch = Partial<Pick<Task, 'title' | 'dueDate' | 'dueTime'>>

interface TasksState {
  tasks: Task[]
  loaded: boolean
  load(): Promise<void>
  /** Replaces the whole list (used by the link with applications). */
  replaceAll(tasks: Task[]): void
  add(title: string, dueDate?: string | null, dueTime?: number | null): void
  update(id: string, patch: TaskPatch): void
  toggle(id: string): void
  /** Deletes a task; returns what's needed to undo it. */
  remove(id: string): { task: Task; index: number } | null
  /** Undo for remove(): puts the task back where it was. */
  restore(task: Task, index: number): void
}

export const useTasks = create<TasksState>((set, get) => {
  const commit = (tasks: Task[]): void => {
    set({ tasks })
    saver.schedule('tasks', () => window.api.tasks.save(tasks))
  }
  const change = (id: string, fn: (t: Task) => Task): void =>
    commit(get().tasks.map((t) => (t.id === id ? fn(t) : t)))

  return {
    tasks: [],
    loaded: false,
    async load() {
      set({ tasks: await window.api.tasks.list(), loaded: true })
    },
    replaceAll: (tasks) => commit(tasks),
    add(title, dueDate = null, dueTime = null) {
      const trimmed = title.trim()
      if (!trimmed) return
      const task: Task = {
        id: newId(),
        title: trimmed,
        done: false,
        dueDate,
        dueTime: dueDate ? dueTime : null,
        createdAt: Date.now(),
        completedAt: null
      }
      commit([...get().tasks, task])
    },
    update(id, patch) {
      change(id, (t) => {
        const next = { ...t, ...patch }
        if (!next.title.trim()) next.title = t.title
        if (!next.dueDate) next.dueTime = null
        return next
      })
    },
    toggle(id) {
      change(id, (t) => toggleTask(t, Date.now()))
    },
    remove(id) {
      const { tasks, removed, index } = removeTask(get().tasks, id)
      if (!removed) return null
      commit(tasks)
      return { task: removed, index }
    },
    restore(task, index) {
      commit(insertTaskAt(get().tasks, task, index))
    }
  }
})
