import { describe, expect, it } from 'vitest'
import {
  normalizeCalendar,
  normalizeNote,
  normalizeNotebooks,
  normalizeSettings,
  normalizeTasks
} from '@shared/normalize'
import { DEFAULT_SETTINGS } from '@shared/types'

describe('normalizeSettings', () => {
  it('falls back to defaults for unknown values', () => {
    expect(normalizeSettings({ theme: 'neon' })).toEqual(DEFAULT_SETTINGS)
  })
  it('keeps valid values', () => {
    expect(normalizeSettings({ theme: 'dark', dayStart: 480 })).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
      dayStart: 480
    })
  })
  it('rejects an hour range where start is after end', () => {
    const s = normalizeSettings({ dayStart: 900, dayEnd: 600 })
    expect([s.dayStart, s.dayEnd]).toEqual([DEFAULT_SETTINGS.dayStart, DEFAULT_SETTINGS.dayEnd])
  })
  it('handles garbage', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings('x')).toEqual(DEFAULT_SETTINGS)
  })
})

describe('normalizeTasks', () => {
  it('drops non-objects and fills defaults', () => {
    const tasks = normalizeTasks([{ title: 'a' }, 5, null])
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({ title: 'a', done: false, dueDate: null, dueTime: null, completedAt: null })
    expect(tasks[0].id).toMatch(/.+/)
  })
  it('returns [] for non-arrays', () => {
    expect(normalizeTasks('nope')).toEqual([])
  })
  it('drops a malformed due date', () => {
    expect(normalizeTasks([{ id: 't', title: 'b', dueDate: 'tomorrow' }])[0].dueDate).toBeNull()
  })
})

describe('normalizeCalendar', () => {
  it('returns empty data for garbage', () => {
    expect(normalizeCalendar('x')).toEqual({ classes: [], events: [] })
  })
  it('drops sessions whose end is not after start, and fills class defaults', () => {
    const cal = normalizeCalendar({
      classes: [
        {
          id: 'c1',
          name: 'Math',
          sessions: [
            { id: 's1', weekday: 1, start: 540, end: 630 },
            { id: 's2', weekday: 3, start: 600, end: 600 }
          ]
        }
      ]
    })
    expect(cal.classes).toHaveLength(1)
    expect(cal.classes[0].sessions).toEqual([{ id: 's1', weekday: 1, start: 540, end: 630 }])
    expect(cal.classes[0].room).toBe('')
    expect(cal.classes[0].color).toMatch(/^#/)
  })
  it('drops events without a valid date', () => {
    const cal = normalizeCalendar({ events: [{ id: 'e1', title: 'Exam', start: 540, end: 600 }] })
    expect(cal.events).toEqual([])
  })
})

describe('normalizeNote', () => {
  it('rejects a note without an id', () => {
    expect(normalizeNote({})).toBeNull()
  })
  it('fills defaults', () => {
    expect(normalizeNote({ id: 'n1' })).toMatchObject({
      id: 'n1',
      title: '',
      text: '',
      content: null,
      notebookId: null,
      pinned: false,
      deletedAt: null
    })
  })
})

describe('normalizeNotebooks', () => {
  it('drops notebooks without an id', () => {
    expect(normalizeNotebooks([{ id: 'b1', name: 'Physics' }, { name: 'no id' }])).toHaveLength(1)
  })
})
