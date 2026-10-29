import type { TimeFormat } from './types'

const pad = (n: number): string => String(n).padStart(2, '0')

/** Local calendar date as 'YYYY-MM-DD'. Never use toISOString() for this — it converts to UTC. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 'YYYY-MM-DD' → Date at local midnight. */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now)
}

/** 'H:mm' or 'HH:mm' → minutes since midnight, or null if invalid. */
export function parseTime(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** Minutes → 'HH:mm' for <input type="time">, which cannot show 24:00. */
export function toTimeInput(min: number): string {
  const v = Math.min(Math.max(0, Math.round(min)), 1439)
  return `${pad(Math.floor(v / 60))}:${pad(v % 60)}`
}

export function formatTime(min: number, fmt: TimeFormat): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (fmt === '24h') return `${pad(h)}:${pad(m)}`
  const suffix = h % 24 < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${pad(m)} ${suffix}`
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function snap(min: number, step = 5): number {
  return Math.round(min / step) * step
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi)
}
