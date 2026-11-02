import { useEffect, useId, useState } from 'react'
import { Copy } from 'lucide-react'
import { isPartialDate, type Bi } from '@shared/profile'
import { countChars, countWords } from '@shared/text'
import { useUi } from '../../state/uiStore'

/** Puts text on the clipboard (through the main process, which works on every page) and says so. */
export function copyToClipboard(text: string): void {
  void window.api.app.copyText(text).then(() => useUi.getState().showToast({ message: 'Copied' }))
}

export function CopyButton({ text, label }: { text: string; label: string }): React.JSX.Element {
  return (
    <button
      type="button"
      className="icon-btn copy-btn"
      aria-label={`Copy ${label}`}
      title="Copy"
      disabled={text === ''}
      onClick={() => copyToClipboard(text)}
    >
      <Copy size={15} />
    </button>
  )
}

/** "123 characters · 20 words", or "123 / 400 characters" with a warning once a set limit is passed. */
export function Counter({ text, limit = null }: { text: string; limit?: number | null }): React.JSX.Element {
  const chars = countChars(text)
  const over = limit !== null && chars > limit
  return (
    <span className="counter" data-over={over || undefined} aria-live="polite">
      {limit === null ? `${chars} characters` : `${chars} / ${limit} characters`} · {countWords(text)} words
      {over && ` · ${chars - limit} over the limit`}
    </span>
  )
}

interface TextFieldProps {
  label: string
  value: string
  onChange(v: string): void
  placeholder?: string
  type?: 'text' | 'email' | 'tel' | 'url' | 'date'
  /** Hide the Copy button (for fields nobody pastes). */
  noCopy?: boolean
}

export function TextField({ label, value, onChange, placeholder, type = 'text', noCopy }: TextFieldProps): React.JSX.Element {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-row">
        <input
          id={id}
          className="input"
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {!noCopy && <CopyButton text={value} label={label} />}
      </div>
    </div>
  )
}

interface LongFieldProps {
  label: string
  value: string
  onChange(v: string): void
  limit?: number | null
  rows?: number
  placeholder?: string
}

/** A text area with a live character and word counter, a Copy button and an over-the-limit warning. */
export function LongField({ label, value, onChange, limit = null, rows = 4, placeholder }: LongFieldProps): React.JSX.Element {
  const id = useId()
  const over = limit !== null && countChars(value) > limit
  return (
    <div className="field">
      <div className="field-head">
        <label htmlFor={id}>{label}</label>
        <CopyButton text={value} label={label} />
      </div>
      <textarea
        id={id}
        className="input textarea"
        rows={rows}
        value={value}
        placeholder={placeholder}
        aria-invalid={over || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      <Counter text={value} limit={limit} />
    </div>
  )
}

const LANGS: Array<['mn' | 'en', string, string]> = [
  ['mn', 'Монгол', 'Mongolian'],
  ['en', 'English', 'English']
]

/** A short text in Mongolian and English, side by side. */
export function BiField({ label, value, onChange }: { label: string; value: Bi; onChange(v: Bi): void }): React.JSX.Element {
  return (
    <fieldset className="bi">
      <legend>{label}</legend>
      <div className="bi-grid">
        {LANGS.map(([lang, shown, name]) => (
          <div className="input-row" key={lang}>
            <input
              className="input"
              lang={lang}
              placeholder={shown}
              aria-label={`${label} (${name})`}
              value={value[lang]}
              onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
            />
            <CopyButton text={value[lang]} label={`${label} (${name})`} />
          </div>
        ))}
      </div>
    </fieldset>
  )
}

/** A long text in Mongolian and English, each with its own counter and Copy button. */
export function BiLongField({ label, value, onChange }: { label: string; value: Bi; onChange(v: Bi): void }): React.JSX.Element {
  return (
    <fieldset className="bi">
      <legend>{label}</legend>
      <div className="bi-grid">
        {LANGS.map(([lang, shown, name]) => (
          <div className="field" key={lang}>
            <div className="field-head">
              <span className="lang-tag">{shown}</span>
              <CopyButton text={value[lang]} label={`${label} (${name})`} />
            </div>
            <textarea
              className="input textarea"
              rows={4}
              lang={lang}
              aria-label={`${label} (${name})`}
              value={value[lang]}
              onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
            />
            <Counter text={value[lang]} />
          </div>
        ))}
      </div>
    </fieldset>
  )
}

interface DateFieldProps {
  label: string
  value: string
  onChange(v: string): void
  /** Accept the word "present" (for end dates). */
  allowPresent?: boolean
}

/** Dates can be partial ("2019", "2026-06"), so this is a text box that only saves what is valid. */
export function DateField({ label, value, onChange, allowPresent }: DateFieldProps): React.JSX.Element {
  const id = useId()
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const valid = isPartialDate(draft) && (allowPresent || draft !== 'present')
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-row">
        <input
          id={id}
          className="input"
          value={draft}
          placeholder={allowPresent ? 'YYYY, YYYY-MM or present' : 'YYYY, YYYY-MM or YYYY-MM-DD'}
          aria-invalid={!valid || undefined}
          onChange={(e) => {
            const v = e.target.value.trim().toLowerCase()
            setDraft(v)
            if (isPartialDate(v) && (allowPresent || v !== 'present')) onChange(v)
          }}
          onBlur={() => setDraft(value)}
        />
        <CopyButton text={value} label={label} />
      </div>
      {!valid && <span className="field-error">Use 2024, 2024-06 or 2024-06-30{allowPresent ? ', or "present"' : ''}.</span>}
    </div>
  )
}

export function NumberField({ label, value, onChange }: { label: string; value: number | null; onChange(v: number | null): void }): React.JSX.Element {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        type="number"
        min={0}
        value={value ?? ''}
        onChange={(e) => {
          const n = e.target.valueAsNumber
          onChange(Number.isFinite(n) && n >= 0 ? n : null)
        }}
      />
    </div>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: T
  options: ReadonlyArray<readonly [T, string]>
  onChange(v: T): void
}): React.JSX.Element {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Comma-separated tags; saved when the box loses focus so typing a comma doesn't jump around. */
export function TagsField({ label, value, onChange }: { label: string; value: string[]; onChange(v: string[]): void }): React.JSX.Element {
  const id = useId()
  const [draft, setDraft] = useState(value.join(', '))
  useEffect(() => setDraft(value.join(', ')), [value])
  const commit = (): void => {
    const next = [...new Set(draft.split(',').map((t) => t.trim()).filter(Boolean))]
    if (next.join('\u0000') !== value.join('\u0000')) onChange(next)
    else setDraft(value.join(', '))
  }
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        value={draft}
        placeholder="comma, separated"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
      />
    </div>
  )
}

/** A colored label for a status; the colors are the same highlighters used for classes. */
export function Badge({ children, color }: { children: React.ReactNode; color: string }): React.JSX.Element {
  return (
    <span className="badge" style={{ background: color }}>
      {children}
    </span>
  )
}
