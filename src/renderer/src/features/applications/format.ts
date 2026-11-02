import type { Status } from '@shared/applications'

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** "Jun 2026", "2019", "Sep 16, 2023": a partial date as a person would write it. */
export function shortDate(d: string): string {
  if (d === 'present') return 'present'
  const [y, m, day] = d.split('-').map(Number)
  if (!y) return ''
  const month = m ? new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' }) : ''
  return [month, day ? `${day},` : '', String(y)].filter(Boolean).join(' ')
}

/** "2019 – 2024", "Jun 2026 – present", "Sep 16, 2023", or ''. */
export function dateRange(start: string, end: string): string {
  const a = shortDate(start)
  const b = shortDate(end)
  if (a && b) return a === b ? a : `${a} – ${b}`
  return a || b
}

/** "in 5 days", "today", "3 days ago". Both dates are 'YYYY-MM-DD'. */
export function relativeDay(date: string, today: string): string {
  const day = (iso: string): number => {
    const [y, m, d] = iso.split('-').map(Number)
    return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
  }
  const diff = day(date) - day(today)
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`
}

/** Badge colors for statuses: the same highlighter colors the calendar uses (dark text on top). */
export const STATUS_COLORS: Record<Status, string> = {
  draft: '#d9dbe3',
  'in-progress': '#ffd84d',
  submitted: '#7cc4ff',
  interview: '#c4a5ff',
  accepted: '#7ee0a1',
  rejected: '#ff8a80',
  withdrawn: '#bfc3cc'
}
