import { create } from 'zustand'
import type { CalendarData, CalendarEvent, ClassItem, ClassSession } from '@shared/types'
import { saver } from './saver'

interface CalendarState {
  data: CalendarData
  loaded: boolean
  load(): Promise<void>
  saveClass(c: ClassItem): void
  deleteClass(id: string): void
  saveEvent(e: CalendarEvent): void
  deleteEvent(id: string): void
  updateSession(classId: string, session: ClassSession): void
}

const upsert = <T extends { id: string }>(list: T[], item: T): T[] =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]

export const useCalendar = create<CalendarState>((set, get) => {
  const commit = (data: CalendarData): void => {
    set({ data })
    saver.schedule('calendar', () => window.api.calendar.save(data))
  }

  return {
    data: { classes: [], events: [] },
    loaded: false,
    async load() {
      set({ data: await window.api.calendar.get(), loaded: true })
    },
    saveClass(c) {
      const { data } = get()
      commit({ ...data, classes: upsert(data.classes, c) })
    },
    deleteClass(id) {
      const { data } = get()
      commit({ ...data, classes: data.classes.filter((c) => c.id !== id) })
    },
    saveEvent(e) {
      const { data } = get()
      commit({ ...data, events: upsert(data.events, e) })
    },
    deleteEvent(id) {
      const { data } = get()
      commit({ ...data, events: data.events.filter((e) => e.id !== id) })
    },
    updateSession(classId, session) {
      const { data } = get()
      commit({
        ...data,
        classes: data.classes.map((c) =>
          c.id === classId ? { ...c, sessions: upsert(c.sessions, session) } : c
        )
      })
    }
  }
})
