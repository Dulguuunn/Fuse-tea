import { useSyncExternalStore } from 'react'
import { saver } from '../state/saver'

const LABEL = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Couldn’t save'
} as const

/** Small "Saving… / Saved" text that follows the app-wide saver. */
export function SaveIndicator(): React.JSX.Element {
  const status = useSyncExternalStore(saver.subscribe, saver.status)
  return (
    <span
      className="save-indicator"
      data-status={status}
      role="status"
      title={status === 'error' ? 'Your last change could not be written to the data folder. It will retry on the next edit.' : undefined}
    >
      {LABEL[status]}
    </span>
  )
}
