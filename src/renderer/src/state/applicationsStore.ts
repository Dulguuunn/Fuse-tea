import { create } from 'zustand'
import { newApplication, type Application } from '@shared/applications'
import { saver } from './saver'

interface ApplicationsState {
  apps: Application[]
  loaded: boolean
  load(): Promise<void>
  /** Replaces the whole list (import, and the link with to-dos). */
  replaceAll(apps: Application[]): void
  /** Adds a new draft application with the default steps; returns its id. */
  add(): string
  /** Changes an application; the "updated" time moves. */
  change(id: string, fn: (a: Application) => Application): void
  patch(id: string, patch: Partial<Application>): void
  /** Deletes an application; returns it with its position so the delete can be undone. */
  remove(id: string): { app: Application; index: number } | null
  restore(app: Application, index: number): void
}

export const useApplications = create<ApplicationsState>((set, get) => {
  const commit = (apps: Application[]): void => {
    set({ apps })
    saver.schedule('applications', () => window.api.applications.save(apps))
  }

  return {
    apps: [],
    loaded: false,
    async load() {
      set({ apps: await window.api.applications.get(), loaded: true })
    },
    replaceAll: (apps) => commit(apps),
    add() {
      const app = newApplication(Date.now())
      commit([app, ...get().apps])
      return app.id
    },
    change(id, fn) {
      commit(get().apps.map((a) => (a.id === id ? { ...fn(a), updatedAt: Date.now() } : a)))
    },
    patch(id, patch) {
      get().change(id, (a) => ({ ...a, ...patch }))
    },
    remove(id) {
      const index = get().apps.findIndex((a) => a.id === id)
      if (index === -1) return null
      const app = get().apps[index]
      commit(get().apps.filter((a) => a.id !== id))
      return { app, index }
    },
    restore(app, index) {
      if (get().apps.some((a) => a.id === app.id)) return
      const apps = [...get().apps]
      apps.splice(Math.min(index, apps.length), 0, app)
      commit(apps)
    }
  }
})
