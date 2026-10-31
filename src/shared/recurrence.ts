import type { CalendarEvent, Repeat } from './types'

const MS_DAY = 86_400_000
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Whole days since 1970-01-01 for a 'YYYY-MM-DD' date (time zones and daylight saving can't shift it). */
function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / MS_DAY)
}

const weekdayOf = (iso: string): number => (dayNumber(iso) + 4) % 7 // 1970-01-01 was a Thursday

/** Weeks are counted Monday to Sunday, so "every 2 weeks" doesn't depend on the week-start setting. */
const weekIndex = (iso: string): number => Math.floor((dayNumber(iso) + 3) / 7)

/** Does this event have a block on `date` ('YYYY-MM-DD')? */
export function occursOn(event: CalendarEvent, date: string): boolean {
  const rule = event.repeat
  if (!rule) return event.date === date
  if (date < event.date) return false
  if (rule.until !== null && date > rule.until) return false
  if (rule.every === 'day') return (dayNumber(date) - dayNumber(event.date)) % rule.interval === 0
  const weekdays = rule.weekdays.length > 0 ? rule.weekdays : [weekdayOf(event.date)]
  if (!weekdays.includes(weekdayOf(date))) return false
  return (weekIndex(date) - weekIndex(event.date)) % rule.interval === 0
}

/** "Every day", "Every 2 days", "Every week on Mon, Tue", "Every 5 weeks on Sun". */
export function repeatLabel(rule: Repeat | undefined): string {
  if (!rule) return 'Does not repeat'
  if (rule.every === 'day') return rule.interval === 1 ? 'Every day' : `Every ${rule.interval} days`
  const every = rule.interval === 1 ? 'Every week' : `Every ${rule.interval} weeks`
  if (rule.weekdays.length === 0) return every
  const order = [1, 2, 3, 4, 5, 6, 0] // Monday first
  const days = order.filter((d) => rule.weekdays.includes(d)).map((d) => SHORT_DAYS[d])
  return `${every} on ${days.join(', ')}`
}
