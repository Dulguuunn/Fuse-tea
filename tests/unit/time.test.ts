import { describe, expect, it } from 'vitest'
import {
  clamp,
  formatDuration,
  formatTime,
  parseISODate,
  parseTime,
  snap,
  toISODate,
  toTimeInput,
  todayISO
} from '@shared/time'

describe('toISODate', () => {
  it('uses the local date just after midnight (UTC+8 safe)', () => {
    expect(toISODate(new Date(2026, 9, 29, 0, 30))).toBe('2026-10-29')
  })
  it('uses the local date just before midnight', () => {
    expect(toISODate(new Date(2026, 9, 29, 23, 59))).toBe('2026-10-29')
  })
  it('pads month and day', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('parseISODate', () => {
  it('returns local midnight of that day', () => {
    const d = parseISODate('2026-10-29')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 29, 0])
  })
})

describe('todayISO', () => {
  it('formats the given moment as a local date', () => {
    expect(todayISO(new Date(2026, 9, 29, 8, 0))).toBe('2026-10-29')
  })
})

describe('parseTime', () => {
  it('parses H:mm and HH:mm', () => {
    expect(parseTime('9:05')).toBe(545)
    expect(parseTime('09:30')).toBe(570)
    expect(parseTime('00:00')).toBe(0)
  })
  it('rejects invalid input', () => {
    expect(parseTime('25:00')).toBeNull()
    expect(parseTime('9:60')).toBeNull()
    expect(parseTime('abc')).toBeNull()
    expect(parseTime('')).toBeNull()
  })
})

describe('toTimeInput', () => {
  it('formats minutes as HH:mm for <input type="time">', () => {
    expect(toTimeInput(545)).toBe('09:05')
  })
  it('caps end-of-day at 23:59 because time inputs cannot show 24:00', () => {
    expect(toTimeInput(1440)).toBe('23:59')
  })
})

describe('formatTime', () => {
  it('formats 24h', () => {
    expect(formatTime(570, '24h')).toBe('09:30')
    expect(formatTime(1440, '24h')).toBe('24:00')
  })
  it('formats 12h', () => {
    expect(formatTime(810, '12h')).toBe('1:30 PM')
    expect(formatTime(0, '12h')).toBe('12:00 AM')
    expect(formatTime(720, '12h')).toBe('12:00 PM')
  })
})

describe('formatDuration', () => {
  it('shows hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m')
    expect(formatDuration(120)).toBe('2h')
    expect(formatDuration(45)).toBe('45m')
  })
})

describe('snap and clamp', () => {
  it('snaps to the nearest step', () => {
    expect(snap(563)).toBe(565)
    expect(snap(562)).toBe(560)
    expect(snap(567, 15)).toBe(570)
  })
  it('clamps into range', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0, 3)).toBe(0)
    expect(clamp(2, 0, 3)).toBe(2)
  })
})
