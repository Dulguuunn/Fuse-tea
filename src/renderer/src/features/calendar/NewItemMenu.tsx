import { useEffect, useRef } from 'react'
import { CalendarPlus, GraduationCap } from 'lucide-react'

interface NewItemMenuProps {
  x: number
  y: number
  label: string
  onClass(): void
  onEvent(): void
  onClose(): void
}

/** Small menu shown where the user clicked an empty time on the grid. */
export function NewItemMenu({ x, y, label, onClass, onEvent, onClose }: NewItemMenuProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.querySelector('button')?.focus()
    const onDown = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const left = Math.min(x, window.innerWidth - 230)
  const top = Math.min(y, window.innerHeight - 130)

  return (
    <div ref={ref} className="popover new-item-menu" style={{ left, top }} role="menu" aria-label={label}>
      <div className="popover-label">{label}</div>
      <button type="button" role="menuitem" className="menu-item" onClick={onClass}>
        <GraduationCap size={16} /> New class
      </button>
      <button type="button" role="menuitem" className="menu-item" onClick={onEvent}>
        <CalendarPlus size={16} /> New event
      </button>
    </div>
  )
}
