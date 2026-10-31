import { useEffect, useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import type { LockResult } from '@shared/ipc'
import { useApplyTheme } from '../useApplyTheme'
import './lock.css'

/** Plain-language message for a failed lock attempt. */
export function lockErrorText(result: Exclude<LockResult, { ok: true }>): string {
  if (result.reason === 'wait') return `Too many tries. Wait ${Math.ceil(result.waitMs / 1000)} seconds, then try again.`
  if (result.reason === 'invalid') return 'Use 4 to 8 digits.'
  return 'That code is not right. Try again.'
}

/** Shown on launch while the lock is on. Calls onUnlocked once the main process accepts the code. */
export function LockScreen({ onUnlocked }: { onUnlocked(): void }): React.JSX.Element {
  useApplyTheme('system') // settings are locked away too, so follow Windows
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => input.current?.focus(), [])

  const submit = async (): Promise<void> => {
    if (busy || !code) return
    setBusy(true)
    const result = await window.api.lock.unlock(code)
    setBusy(false)
    if (result.ok) {
      onUnlocked()
      return
    }
    setError(lockErrorText(result))
    setCode('')
    input.current?.focus()
  }

  return (
    <div className="lock-screen">
      <form
        className="lock-card"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <Lock size={22} aria-hidden />
        <h1 className="lock-title">Ponder</h1>
        <input
          ref={input}
          className="input lock-input"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          placeholder="Enter code"
          aria-label="Code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ''))
            setError('')
          }}
        />
        <p className="field-error lock-error" role="alert">
          {error}
        </p>
        <button type="submit" className="btn btn-primary" disabled={busy || !code}>
          Unlock
        </button>
      </form>
    </div>
  )
}
