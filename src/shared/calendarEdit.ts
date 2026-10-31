import { clamp, snap } from './time'

/** Shortest class or event, in minutes. */
export const MIN_DURATION = 5
const DAY_END = 1440
const DEFAULT_LENGTH = 90

export interface Slot {
  start: number
  end: number
}

/** Result of dragging a block by `deltaMin`: move keeps the length, resize changes the end.
 *  Snaps to 5 minutes and never leaves the day (00:00–24:00). */
export function applyDrag(slot: Slot, mode: 'move' | 'resize', deltaMin: number): Slot {
  if (mode === 'move') {
    const length = slot.end - slot.start
    const start = clamp(snap(slot.start + deltaMin), 0, DAY_END - length)
    return { start, end: start + length }
  }
  const end = clamp(snap(slot.end + deltaMin), slot.start + MIN_DURATION, DAY_END)
  return { start: slot.start, end }
}

/** Problem with a start/end pair typed into a dialog, or null if it's fine. */
export function validateSlot(start: number | null, end: number | null): string | null {
  if (start === null || end === null) return 'Enter a start and an end time.'
  if (end <= start) return 'The end time must be after the start time.'
  if (end - start < MIN_DURATION) return `It must be at least ${MIN_DURATION} minutes long.`
  return null
}

/** Default slot for a click on the grid: starts on the clicked quarter hour, lasts 1:30. */
export function slotAt(minute: number): Slot {
  const start = clamp(Math.floor(minute / 15) * 15, 0, DAY_END - MIN_DURATION)
  return { start, end: Math.min(start + DEFAULT_LENGTH, DAY_END) }
}
