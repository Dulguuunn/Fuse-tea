import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface DialogProps {
  title: string
  onClose(): void
  children: ReactNode
  footer?: ReactNode
  width?: number
}

/** Modal dialog built on <dialog>: focus stays inside, Esc and clicking outside close it.
 *  Render it conditionally ({open && <Dialog …/>}); it opens when mounted. */
export function Dialog({ title, onClose, children, footer, width = 440 }: DialogProps): React.JSX.Element {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    return () => d?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className="dialog"
      style={{ width }}
      aria-label={title}
      onCancel={(e) => {
        // React passes this to dialogs further up the tree (e.g. a class dialog under its delete
        // confirmation); only the top one should close.
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }}
      onMouseDown={(e) => {
        e.stopPropagation()
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="dialog-inner">
        <header className="dialog-header">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="dialog-body">{children}</div>
        {footer && <footer className="dialog-footer">{footer}</footer>}
      </div>
    </dialog>
  )
}
