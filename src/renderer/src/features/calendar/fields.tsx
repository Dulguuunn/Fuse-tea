import { CLASS_COLORS } from '@shared/calendar'
import { formatDuration, parseTime, toTimeInput } from '@shared/time'

/** Time input text → minutes. An unchanged "23:59" that was originally 24:00 stays 24:00. */
export function readTime(text: string, original?: number): number | null {
  if (original === 1440 && text === toTimeInput(1440)) return 1440
  return parseTime(text)
}

export function ColorPicker({ value, onChange }: { value: string; onChange(c: string): void }): React.JSX.Element {
  return (
    <div className="field">
      Color
      <div className="swatches" role="radiogroup" aria-label="Color">
        {CLASS_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={value.toLowerCase() === c.value}
            aria-label={c.name}
            title={c.name}
            className="swatch"
            style={{ background: c.value }}
            onClick={() => onChange(c.value)}
          />
        ))}
      </div>
    </div>
  )
}

interface TimeRangeProps {
  start: string
  end: string
  onStart(v: string): void
  onEnd(v: string): void
  /** Minutes for the duration label, when both times are valid. */
  length: number | null
  label?: string
}

export function TimeRange({ start, end, onStart, onEnd, length, label = 'Time' }: TimeRangeProps): React.JSX.Element {
  return (
    <div className="time-range">
      <input className="input" type="time" value={start} aria-label={`${label} start`} onChange={(e) => onStart(e.target.value)} />
      <span className="muted">to</span>
      <input className="input" type="time" value={end} aria-label={`${label} end`} onChange={(e) => onEnd(e.target.value)} />
      <span className="duration">{length !== null && length > 0 ? formatDuration(length) : ''}</span>
    </div>
  )
}

const SUNDAY = new Date(2026, 9, 25)
export const weekdayName = (weekday: number): string =>
  new Date(SUNDAY.getFullYear(), SUNDAY.getMonth(), SUNDAY.getDate() + weekday).toLocaleDateString('en-US', {
    weekday: 'long'
  })

export const weekdayOrder = (weekStartsOn: 0 | 1): number[] =>
  weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6]
