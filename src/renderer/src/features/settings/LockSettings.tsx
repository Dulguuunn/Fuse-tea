import { useEffect, useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { lockErrorText } from '../../components/LockScreen'

type Mode = 'change' | 'off' | 'on'

const TITLES: Record<Mode, string> = { change: 'Change code', off: 'Turn off lock', on: 'Turn on lock' }

/** Settings controls for the launch lock: change the code, turn it off, or turn it back on. */
export function LockSettings(): React.JSX.Element {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [mode, setMode] = useState<Mode | null>(null)

  const refresh = (): void => void window.api.lock.status().then((s) => setEnabled(s.enabled))
  useEffect(refresh, [])

  if (enabled === null) return <></>
  return (
    <>
      {enabled ? (
        <div className="lock-actions">
          <button type="button" className="btn" onClick={() => setMode('change')}>
            Change code
          </button>
          <button type="button" className="btn" onClick={() => setMode('off')}>
            Turn off
          </button>
        </div>
      ) : (
        <button type="button" className="btn" onClick={() => setMode('on')}>
          Turn on
        </button>
      )}
      {mode && (
        <CodeDialog
          mode={mode}
          onClose={() => setMode(null)}
          onDone={() => {
            setMode(null)
            refresh()
          }}
        />
      )}
    </>
  )
}

function CodeDialog({ mode, onClose, onDone }: { mode: Mode; onClose(): void; onDone(): void }): React.JSX.Element {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState('')
  const needsCurrent = mode !== 'on'
  const needsNext = mode !== 'off'
  const digits = (v: string): string => v.replace(/\D/g, '')

  const save = async (): Promise<void> => {
    const result = await window.api.lock.change(current, needsNext ? next : null)
    if (result.ok) onDone()
    else setError(lockErrorText(result))
  }

  return (
    <Dialog
      title={TITLES[mode]}
      onClose={onClose}
      width={380}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="lock-form"
            className="btn btn-primary"
            disabled={(needsCurrent && !current) || (needsNext && !next)}
          >
            {mode === 'off' ? 'Turn off lock' : 'Save'}
          </button>
        </>
      }
    >
      <form
        id="lock-form"
        className="lock-form"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {needsCurrent && (
          <label className="field">
            Current code
            <input
              className="input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              autoFocus
              value={current}
              onChange={(e) => {
                setCurrent(digits(e.target.value))
                setError('')
              }}
            />
          </label>
        )}
        {needsNext && (
          <label className="field">
            New code (4 to 8 digits)
            <input
              className="input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              autoFocus={!needsCurrent}
              value={next}
              onChange={(e) => {
                setNext(digits(e.target.value))
                setError('')
              }}
            />
          </label>
        )}
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  )
}
