import { create } from 'zustand'
import { newId } from '@shared/id'
import { toggleTask } from '@shared/tasks'
import type { Task } from '@shared/types'
import { saver } from './saver'

export type TaskPatch = Partial<Pick<Task, 'title' | 'dueDate' | 'dueTime'>>

interface TasksState {
  tasks: Task[]
  loaded: boolean
  load(): Promise<void>
  add(title: string, dueDate?: string | null, dueTime?: number | null): void
  update(id: string, patch: TaskPatch): void
  toggle(id: string): void
  remove(id: string): void
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
      commit(get().tasks.filter((t) => t.id !== id))
    }
  }
})
