import { weekdayOrder } from './fields'
import type { Repeat } from '@shared/types'

/** What the "Repeats" controls hold while the dialog is open. */
export interface RepeatDraft {
  kind: 'none' | 'day' | 'week'
  /** Text of the "every N" box. */
  interval: string
  weekdays: number[]
  until: string
}

const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function draftFromRepeat(r: Repeat | undefined): RepeatDraft {
  if (!r) return { kind: 'none', interval: '1', weekdays: [], until: '' }
  return { kind: r.every, interval: String(r.interval), weekdays: r.weekdays, until: r.until ?? '' }
}

const intervalOf = (d: RepeatDraft): number => Number(d.interval)

/** The Repeat to save, or null for "does not repeat". Check repeatError first. */
export function repeatFromDraft(d: RepeatDraft): Repeat | null {
  if (d.kind === 'none') return null
  return {
    every: d.kind,
    interval: intervalOf(d),
    weekdays: d.kind === 'week' ? [...d.weekdays].sort((a, b) => a - b) : [],
    until: d.until || null
  }
}

export function repeatError(d: RepeatDraft, firstDate: string): string | null {
  if (d.kind === 'none') return null
  const n = intervalOf(d)
  if (!Number.isInteger(n) || n < 1 || n > 99) return 'Repeat every 1 to 99 days or weeks.'
  if (d.kind === 'week' && d.weekdays.length === 0) return 'Pick at least one day of the week.'
  if (d.until && firstDate && d.until < firstDate) return 'The repeat must end on or after the first day.'
  return null
}

interface RepeatFieldProps {
  value: RepeatDraft
  /** Weekday (0 = Sunday) of the event's date, preselected when switching to weekly. */
  dateWeekday: number
  weekStartsOn: 0 | 1
  onChange(v: RepeatDraft): void
}

export function RepeatField({ value, dateWeekday, weekStartsOn, onChange }: RepeatFieldProps): React.JSX.Element {
  const set = (patch: Partial<RepeatDraft>): void => onChange({ ...value, ...patch })
  const unit = value.kind === 'day' ? 'day' : 'week'
  const plural = intervalOf(value) === 1 ? '' : 's'

  return (
    <div className="field">
      Repeats
      <select
        className="select"
        aria-label="Repeats"
        value={value.kind}
        onChange={(e) => {
          const kind = e.target.value as RepeatDraft['kind']
          set({ kind, weekdays: kind === 'week' && value.weekdays.length === 0 ? [dateWeekday] : value.weekdays })
        }}
      >
        <option value="none">Does not repeat</option>
        <option value="day">Every day (or every few days)</option>
        <option value="week">Every week (or every few weeks)</option>
      </select>
      {value.kind !== 'none' && (
        <div className="repeat-body">
          <div className="repeat-line">
            <span>Every</span>
            <input
              className="input repeat-interval"
              type="number"
              min={1}
              max={99}
              aria-label="Repeat every"
              value={value.interval}
              onChange={(e) => set({ interval: e.target.value })}
            />
            <span>
              {unit}
              {plural}
            </span>
          </div>
          {value.kind === 'week' && (
            <div className="repeat-days" role="group" aria-label="Days of the week">
              {weekdayOrder(weekStartsOn).map((d) => {
                const on = value.weekdays.includes(d)
                return (
                  <button
                    key={d}
                    type="button"
                    className="repeat-day"
                    aria-pressed={on}
                    onClick={() => set({ weekdays: on ? value.weekdays.filter((x) => x !== d) : [...value.weekdays, d] })}
                  >
                    {SHORT[d]}
                  </button>
                )
              })}
            </div>
          )}
          <label className="repeat-line">
            <span>Until</span>
            <input
              className="input"
              type="date"
              aria-label="Repeat until"
              value={value.until}
              onChange={(e) => set({ until: e.target.value })}
            />
            <span className="muted">Leave empty to repeat forever.</span>
          </label>
        </div>
      )}
    </div>
  )
}
