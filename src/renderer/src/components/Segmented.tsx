interface SegmentedProps<T extends string | number> {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange(value: T): void
}

/** A row of mutually exclusive buttons (like a radio group). */
export function Segmented<T extends string | number>({ label, value, options, onChange }: SegmentedProps<T>): React.JSX.Element {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className="segmented-item"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
