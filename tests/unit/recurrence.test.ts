import { describe, expect, it } from 'vitest'
import { occursOn, repeatLabel } from '@shared/recurrence'
import { normalizeCalendar } from '@shared/normalize'
import { occurrencesForWeek, weekDays } from '@shared/calendar'
import type { CalendarEvent, Repeat } from '@shared/types'

const ev = (date: string, repeat?: Repeat): CalendarEvent => ({
  id: 'e1',
  title: 'Thing',
  date,
  start: 480,
  end: 495,
  color: '#7cc4ff',
  location: '',
  ...(repeat ? { repeat } : {})
})
const daily = (interval = 1, until: string | null = null): Repeat => ({ every: 'day', interval, weekdays: [], until })
const weekly = (weekdays: number[], interval = 1, until: string | null = null): Repeat => ({
  every: 'week',
  interval,
  weekdays,
  until
})

describe('occursOn', () => {
  it('a one-off event happens only on its date', () => {
    expect(occursOn(ev('2026-11-02'), '2026-11-02')).toBe(true)
    expect(occursOn(ev('2026-11-02'), '2026-11-03')).toBe(false)
  })

  it('never happens before its first date', () => {
    expect(occursOn(ev('2026-11-02', daily()), '2026-11-01')).toBe(false)
    expect(occursOn(ev('2026-11-02', daily()), '2026-11-02')).toBe(true)
  })

  it('every day, including across a month and year end', () => {
    const e = ev('2026-11-02', daily())
    expect(occursOn(e, '2026-11-30')).toBe(true)
    expect(occursOn(e, '2027-01-25')).toBe(true)
  })

  it('every 2 days hits every other date', () => {
    const e = ev('2026-11-02', daily(2))
    expect(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'].map((d) => occursOn(e, d))).toEqual([
      true,
      false,
      true,
      false
    ])
  })

  it('stops after the until date (inclusive)', () => {
    const e = ev('2026-11-02', daily(1, '2026-11-14'))
    expect(occursOn(e, '2026-11-14')).toBe(true)
    expect(occursOn(e, '2026-11-15')).toBe(false)
  })

  it('weekly on chosen weekdays (Mon-Fri)', () => {
    const e = ev('2026-11-02', weekly([1, 2, 3, 4, 5])) // Mon Nov 2
    expect(occursOn(e, '2026-11-06')).toBe(true) // Friday
    expect(occursOn(e, '2026-11-07')).toBe(false) // Saturday
    expect(occursOn(e, '2026-11-08')).toBe(false) // Sunday
    expect(occursOn(e, '2026-11-09')).toBe(true) // next Monday
  })

  it('weekly with no weekdays chosen uses the weekday of the first date', () => {
    const e = ev('2026-11-04', weekly([])) // a Wednesday
    expect(occursOn(e, '2026-11-11')).toBe(true)
    expect(occursOn(e, '2026-11-10')).toBe(false)
  })

  it('every 2 weeks skips the weeks in between, counting weeks from Monday', () => {
    const e = ev('2026-11-01', weekly([0, 3], 2)) // Sunday Nov 1 is the END of the week of Oct 26
    expect(occursOn(e, '2026-11-01')).toBe(true)
    expect(occursOn(e, '2026-11-04')).toBe(false) // Wed of the next week: off week
    expect(occursOn(e, '2026-11-08')).toBe(false) // Sunday, still the off week
    expect(occursOn(e, '2026-11-11')).toBe(true) // Wed two weeks after the week of Oct 26
  })

  it('a weekly event whose first date is not one of the chosen weekdays starts on the next chosen one', () => {
    const e = ev('2026-11-03', weekly([0])) // Tuesday start, Sundays only
    expect(occursOn(e, '2026-11-03')).toBe(false)
    expect(occursOn(e, '2026-11-08')).toBe(true)
  })
})

describe('occurrencesForWeek with repeating events', () => {
  it('lists one block per matching day, each with its own key', () => {
    const data = { classes: [], events: [ev('2026-11-02', weekly([1, 3]))] }
    const week = weekDays(new Date(2026, 10, 4), 1) // Mon Nov 2 - Sun Nov 8
    const occ = occurrencesForWeek(data, week)
    expect(occ.map((o) => o.date)).toEqual(['2026-11-02', '2026-11-04'])
    expect(new Set(occ.map((o) => o.key)).size).toBe(2)
    expect(occ.every((o) => o.refId === 'e1')).toBe(true)
  })
})

describe('normalizeCalendar repeat', () => {
  const raw = (repeat: unknown): unknown => ({
    classes: [],
    events: [{ id: 'a', title: 'x', date: '2026-11-02', start: 480, end: 495, color: '#7cc4ff', location: '', repeat }]
  })

  it('keeps a valid repeat rule', () => {
    const { events } = normalizeCalendar(raw({ every: 'week', interval: 2, weekdays: [3, 1, 3], until: '2026-12-01' }))
    expect(events[0].repeat).toEqual({ every: 'week', interval: 2, weekdays: [1, 3], until: '2026-12-01' })
  })

  it('drops garbage and fixes out-of-range values', () => {
    expect(normalizeCalendar(raw('daily')).events[0].repeat).toBeUndefined()
    expect(normalizeCalendar(raw({ every: 'year', interval: 1 })).events[0].repeat).toBeUndefined()
    expect(normalizeCalendar(raw({ every: 'day', interval: 0, until: 'soon' })).events[0].repeat).toEqual({
      every: 'day',
      interval: 1,
      weekdays: [],
      until: null
    })
  })
})

describe('repeatLabel', () => {
  it('describes a rule in plain words', () => {
    expect(repeatLabel(undefined)).toBe('Does not repeat')
    expect(repeatLabel(daily())).toBe('Every day')
    expect(repeatLabel(daily(2))).toBe('Every 2 days')
    expect(repeatLabel(weekly([1, 2, 3, 4, 5]))).toBe('Every week on Mon, Tue, Wed, Thu, Fri')
    expect(repeatLabel(weekly([0], 5))).toBe('Every 5 weeks on Sun')
  })
})
