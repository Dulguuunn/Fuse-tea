import { describe, expect, it } from 'vitest'
import {
  layoutDay,
  occurrencesForWeek,
  visibleRange,
  weekDays,
  weekLabel,
  type Occurrence
} from '@shared/calendar'
import { toISODate } from '@shared/time'
import { DEFAULT_SETTINGS, type CalendarData } from '@shared/types'

const THU = new Date(2026, 9, 29, 15, 30)

describe('weekDays', () => {
  it('starts on Monday when weekStartsOn = 1', () => {
    const days = weekDays(THU, 1).map(toISODate)
    expect(days[0]).toBe('2026-10-26')
    expect(days[6]).toBe('2026-11-01')
  })
  it('starts on Sunday when weekStartsOn = 0', () => {
    expect(toISODate(weekDays(THU, 0)[0])).toBe('2026-10-25')
  })
  it('returns local midnights', () => {
    expect(weekDays(THU, 1).every((d) => d.getHours() === 0 && d.getMinutes() === 0)).toBe(true)
  })
  it('handles an anchor that is itself the first day', () => {
    expect(toISODate(weekDays(new Date(2026, 9, 26, 0, 5), 1)[0])).toBe('2026-10-26')
  })
})

describe('weekLabel', () => {
  it('same month', () => {
    expect(weekLabel(weekDays(new Date(2026, 9, 7), 1))).toBe('Oct 5 – 11, 2026')
  })
  it('across months', () => {
    expect(weekLabel(weekDays(THU, 1))).toBe('Oct 26 – Nov 1, 2026')
  })
  it('across years', () => {
    expect(weekLabel(weekDays(new Date(2026, 11, 30), 1))).toBe('Dec 28, 2026 – Jan 3, 2027')
  })
})

const data: CalendarData = {
  classes: [
    {
      id: 'math',
      name: 'Math',
      room: 'B12',
      color: '#ffd84d',
      sessions: [
        { id: 'mon', weekday: 1, start: 540, end: 630 },
        { id: 'wed', weekday: 3, start: 780, end: 900 }
      ]
    }
  ],
  events: [
    { id: 'exam', title: 'Exam', date: '2026-10-30', start: 600, end: 720, color: '#ff9f6b', location: 'Hall A' },
    { id: 'later', title: 'Later', date: '2026-11-05', start: 600, end: 660, color: '#ff9f6b', location: '' }
  ]
}

describe('occurrencesForWeek', () => {
  const occ = occurrencesForWeek(data, weekDays(THU, 1))

  it('repeats each class slot on its weekday with its own times', () => {
    const math = occ.filter((o) => o.kind === 'class')
    expect(math.map((o) => [o.date, o.start, o.end])).toEqual([
      ['2026-10-26', 540, 630],
      ['2026-10-28', 780, 900]
    ])
    expect(math[0]).toMatchObject({ refId: 'math', sessionId: 'mon', title: 'Math', subtitle: 'B12' })
  })
  it('includes one-off events only in their own week', () => {
    expect(occ.filter((o) => o.kind === 'event').map((o) => o.refId)).toEqual(['exam'])
  })
  it('gives every occurrence a unique key', () => {
    expect(new Set(occ.map((o) => o.key)).size).toBe(occ.length)
  })
})

const item = (key: string, start: number, end: number): Occurrence => ({
  key,
  kind: 'event',
  refId: key,
  sessionId: null,
  title: key,
  subtitle: '',
  color: '#000000',
  date: '2026-10-29',
  start,
  end,
  repeats: false
})

describe('layoutDay', () => {
  it('puts two overlapping items side by side', () => {
    const laid = layoutDay([item('a', 540, 630), item('b', 600, 700)])
    expect(laid.map((l) => [l.key, l.col, l.cols])).toEqual([
      ['a', 0, 2],
      ['b', 1, 2]
    ])
  })
  it('gives a non-overlapping item the full width', () => {
    const laid = layoutDay([item('a', 540, 630), item('b', 600, 700), item('c', 720, 780)])
    expect(laid.find((l) => l.key === 'c')).toMatchObject({ col: 0, cols: 1 })
  })
  it('treats back-to-back items as not overlapping', () => {
    const laid = layoutDay([item('a', 540, 630), item('b', 630, 700)])
    expect(laid.map((l) => l.cols)).toEqual([1, 1])
  })
  it('reuses a free column inside a cluster', () => {
    const laid = layoutDay([item('long', 540, 800), item('x', 560, 600), item('y', 620, 660)])
    expect(laid.find((l) => l.key === 'y')).toMatchObject({ col: 1, cols: 2 })
  })
})

describe('visibleRange', () => {
  it('uses the settings when everything fits', () => {
    expect(visibleRange(DEFAULT_SETTINGS, [item('a', 540, 600)])).toEqual({ start: 420, end: 1320 })
  })
  it('expands to whole hours to show items outside the range', () => {
    expect(visibleRange(DEFAULT_SETTINGS, [item('early', 370, 450), item('late', 1330, 1395)])).toEqual({
      start: 360,
      end: 1440
    })
  })
})
