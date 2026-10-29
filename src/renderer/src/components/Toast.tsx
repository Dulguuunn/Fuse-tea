import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useUi } from '../state/uiStore'

const TOAST_MS = 6000

/** Short message at the bottom of the window with an optional action (like Undo). Hides after 6 s. */
export function Toast(): React.JSX.Element {
  const toast = useUi((s) => s.toast)
  const hide = useUi((s) => s.hideToast)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(hide, TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast, hide])

  return (
    <div className="toast-region" aria-live="polite">
      {toast && (
        <div key={toast.id} className="toast" role="status">
          <span className="toast-message">{toast.message}</span>
          {toast.actionLabel && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.onAction?.()
                hide()
              }}
            >
              {toast.actionLabel}
            </button>
          )}
          <button type="button" className="icon-btn toast-close" aria-label="Dismiss" onClick={hide}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
