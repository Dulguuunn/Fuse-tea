import { useRef, useState } from 'react'
import type { Occurrence } from '@shared/calendar'
import { applyDrag, type Slot } from '@shared/calendarEdit'

export interface DragPreview {
  occ: Occurrence
  dayIndex: number
  slot: Slot
}

interface DragOptions {
  /** Pixels per minute on the grid. */
  ppm: number
  /** Which day column (0–6) is under this x coordinate. */
  columnAt(clientX: number): number
  onOpen(occ: Occurrence): void
  onMove(occ: Occurrence, dayIndex: number, slot: Slot): void
}

/** The drag in progress. It remembers its own block, so events reaching another element can't
 *  apply it to the wrong class. */
interface Active {
  occ: Occurrence
  fromDay: number
  mode: 'move' | 'resize'
  x: number
  y: number
  moved: boolean
  preview: DragPreview
}

const DRAG_THRESHOLD_PX = 4

/** Drag a block to move it (also to another day), drag its bottom edge to resize, click to open it. */
export function useBlockDrag({ ppm, columnAt, onOpen, onMove }: DragOptions) {
  const active = useRef<Active | null>(null)
  const justDragged = useRef(false)
  const [preview, setPreview] = useState<DragPreview | null>(null)

  const cancel = (): void => {
    active.current = null
    setPreview(null)
  }

  const finish = (): void => {
    const a = active.current
    cancel()
    if (!a) return
    if (!a.moved) {
      onOpen(a.occ)
      return
    }
    // The click that follows pointerup must not count as a click on the empty grid.
    justDragged.current = true
    setTimeout(() => (justDragged.current = false), 0)
    const { dayIndex, slot } = a.preview
    if (dayIndex !== a.fromDay || slot.start !== a.occ.start || slot.end !== a.occ.end) onMove(a.occ, dayIndex, slot)
  }

  const bind = (occ: Occurrence, dayIndex: number) => ({
    onPointerDown(e: React.PointerEvent<HTMLElement>) {
      if (e.button !== 0) return
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      active.current = {
        occ,
        fromDay: dayIndex,
        mode: (e.target as HTMLElement).closest('[data-handle]') ? 'resize' : 'move',
        x: e.clientX,
        y: e.clientY,
        moved: false,
        preview: { occ, dayIndex, slot: { start: occ.start, end: occ.end } }
      }
    },
    onPointerMove(e: React.PointerEvent<HTMLElement>) {
      const a = active.current
      if (!a) return
      if ((e.buttons & 1) === 0) return cancel() // button released somewhere we didn't hear about
      if (!a.moved && Math.hypot(e.clientX - a.x, e.clientY - a.y) < DRAG_THRESHOLD_PX) return
      a.moved = true
      a.preview = {
        occ: a.occ,
        dayIndex: a.mode === 'move' ? columnAt(e.clientX) : a.fromDay,
        slot: applyDrag({ start: a.occ.start, end: a.occ.end }, a.mode, (e.clientY - a.y) / ppm)
      }
      setPreview(a.preview)
    },
    onPointerUp: finish,
    onLostPointerCapture: finish,
    onPointerCancel: cancel,
    onKeyDown(e: React.KeyboardEvent<HTMLElement>) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onOpen(occ)
      }
    }
  })

  return { bind, preview, justDragged }
}
